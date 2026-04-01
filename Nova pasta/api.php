<?php
// =============================================
//  BISCA 61 – api.php  (coloca em /Carta/api.php)
// =============================================
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST,GET,OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
if ($_SERVER['REQUEST_METHOD']==='OPTIONS'){http_response_code(200);exit;}

define('DB_HOST','localhost');
define('DB_USER','root');
define('DB_PASS','');
define('DB_NAME','bisca61');

function db(){
    static $p=null;
    if($p)return $p;
    try{
        $p=new PDO('mysql:host='.DB_HOST.';dbname='.DB_NAME.';charset=utf8mb4',
            DB_USER,DB_PASS,[PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION,PDO::ATTR_DEFAULT_FETCH_MODE=>PDO::FETCH_ASSOC]);
    }catch(PDOException $e){resp(['erro'=>'BD: '.$e->getMessage()],500);}
    return $p;
}
function resp($d,$c=200){http_response_code($c);echo json_encode($d,JSON_UNESCAPED_UNICODE);exit;}
function gerarCodigo(){
    $c='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    $s='';for($i=0;$i<4;$i++)$s.=$c[random_int(0,strlen($c)-1)];
    return $s;
}
function gerarToken(){return bin2hex(random_bytes(32));}

$in=json_decode(file_get_contents('php://input'),true)??[];
$action=$_GET['action']??$in['action']??'';

// Limpar sessões e salas antigas
try{
    $db=db();
    $db->exec("DELETE FROM sessoes WHERE criado_em < DATE_SUB(NOW(), INTERVAL 24 HOUR)");
    $db->exec("DELETE j FROM jogadores j JOIN salas s ON j.sala_codigo=s.codigo WHERE s.criado_em < DATE_SUB(NOW(), INTERVAL 3 HOUR)");
    $db->exec("DELETE FROM estado_jogo WHERE sala_codigo NOT IN (SELECT codigo FROM salas)");
    $db->exec("DELETE FROM salas WHERE criado_em < DATE_SUB(NOW(), INTERVAL 3 HOUR)");
}catch(Exception $e){}

switch($action){

// ─── LOGIN / REGISTO ────────────────────────────
case 'login':
    $username=trim($in['username']??'');
    $avatar=(int)($in['avatar']??1);
    if(!$username||strlen($username)<2)resp(['erro'=>'Nome inválido'],400);
    if($avatar<1||$avatar>8)$avatar=1;
    $db=db();
    $st=$db->prepare("SELECT id,username,avatar,match_pts,vitorias,derrotas FROM utilizadores WHERE username=?");
    $st->execute([$username]);
    $user=$st->fetch();
    if(!$user){
        $db->prepare("INSERT INTO utilizadores (username,avatar) VALUES (?,?)")->execute([$username,$avatar]);
        $userId=(int)$db->lastInsertId();
        $user=['id'=>$userId,'username'=>$username,'avatar'=>$avatar,'match_pts'=>0,'vitorias'=>0,'derrotas'=>0];
    } else {
        // actualizar avatar se mudou
        if($user['avatar']!=$avatar) $db->prepare("UPDATE utilizadores SET avatar=? WHERE id=?")->execute([$avatar,$user['id']]);
        $user['avatar']=$avatar;
    }
    $token=gerarToken();
    $db->prepare("INSERT INTO sessoes (token,user_id,username,avatar) VALUES (?,?,?,?)")->execute([$token,$user['id'],$username,$avatar]);
    resp(['ok'=>true,'token'=>$token,'user'=>$user]);

// ─── VERIFICAR TOKEN ────────────────────────────
case 'me':
    $token=trim($_GET['token']??$in['token']??'');
    if(!$token)resp(['erro'=>'Token em falta'],401);
    $db=db();
    $st=$db->prepare("SELECT s.token,s.user_id,s.username,s.avatar,u.match_pts,u.vitorias,u.derrotas FROM sessoes s JOIN utilizadores u ON s.user_id=u.id WHERE s.token=?");
    $st->execute([$token]);
    $row=$st->fetch();
    if(!$row)resp(['erro'=>'Sessão inválida'],401);
    resp(['ok'=>true,'user'=>$row]);

// ─── CRIAR SALA ─────────────────────────────────
case 'criar_sala':
    $token=trim($in['token']??'');
    $numJ=(int)($in['num_jogadores']??4);
    if(!in_array($numJ,[2,4]))resp(['erro'=>'Modo inválido'],400);
    $db=db();
    $sess=$db->prepare("SELECT user_id,username,avatar FROM sessoes WHERE token=?");
    $sess->execute([$token]);$sess=$sess->fetch();
    if(!$sess)resp(['erro'=>'Não autenticado'],401);
    $codigo='';
    for($t=0;$t<10;$t++){
        $c=gerarCodigo();
        $ex=$db->prepare("SELECT 1 FROM salas WHERE codigo=?");$ex->execute([$c]);
        if(!$ex->fetch()){$codigo=$c;break;}
    }
    if(!$codigo)resp(['erro'=>'Tente novamente'],500);
    $db->prepare("INSERT INTO salas (codigo,num_jogadores,host_id) VALUES (?,?,?)")->execute([$codigo,$numJ,$sess['user_id']]);
    $db->prepare("INSERT INTO jogadores (sala_codigo,user_id,username,avatar,slot) VALUES (?,?,?,?,0)")->execute([$codigo,$sess['user_id'],$sess['username'],$sess['avatar']]);
    resp(['ok'=>true,'codigo'=>$codigo,'slot'=>0]);

// ─── ENTRAR NA SALA ─────────────────────────────
case 'entrar_sala':
    $token=trim($in['token']??'');
    $codigo=strtoupper(trim($in['codigo']??''));
    $db=db();
    $sess=$db->prepare("SELECT user_id,username,avatar FROM sessoes WHERE token=?");
    $sess->execute([$token]);$sess=$sess->fetch();
    if(!$sess)resp(['erro'=>'Não autenticado'],401);
    $sala=$db->prepare("SELECT * FROM salas WHERE codigo=?");$sala->execute([$codigo]);$sala=$sala->fetch();
    if(!$sala)resp(['erro'=>'Sala não encontrada'],404);
    if($sala['estado']!=='aguardando')resp(['erro'=>'Jogo já iniciado'],400);
    $slots=$db->prepare("SELECT slot,user_id FROM jogadores WHERE sala_codigo=? ORDER BY slot");$slots->execute([$codigo]);
    $slotData=$slots->fetchAll();
    // já está nesta sala?
    foreach($slotData as $sd){if($sd['user_id']==$sess['user_id'])resp(['ok'=>true,'codigo'=>$codigo,'slot'=>$sd['slot'],'num_jogadores'=>(int)$sala['num_jogadores']]);}
    if(count($slotData)>=$sala['num_jogadores'])resp(['erro'=>'Sala cheia'],400);
    $taken=array_column($slotData,'slot');
    $next=0;while(in_array($next,$taken))$next++;
    $db->prepare("INSERT INTO jogadores (sala_codigo,user_id,username,avatar,slot) VALUES (?,?,?,?,?)")->execute([$codigo,$sess['user_id'],$sess['username'],$sess['avatar'],$next]);
    resp(['ok'=>true,'codigo'=>$codigo,'slot'=>$next,'num_jogadores'=>(int)$sala['num_jogadores']]);

// ─── ESTADO DA SALA ─────────────────────────────
case 'estado_sala':
    $codigo=strtoupper(trim($_GET['codigo']??$in['codigo']??''));
    if(!$codigo)resp(['erro'=>'Código em falta'],400);
    $db=db();
    $sala=$db->prepare("SELECT * FROM salas WHERE codigo=?");$sala->execute([$codigo]);$sala=$sala->fetch();
    if(!$sala)resp(['erro'=>'Sala não encontrada'],404);
    $jogs=$db->prepare("SELECT user_id,username,avatar,slot FROM jogadores WHERE sala_codigo=? ORDER BY slot");$jogs->execute([$codigo]);$jogs=$jogs->fetchAll();
    $jogo=null;
    if($sala['estado']==='jogando'){
        $est=$db->prepare("SELECT estado_json FROM estado_jogo WHERE sala_codigo=?");$est->execute([$codigo]);$row=$est->fetch();
        if($row)$jogo=json_decode($row['estado_json'],true);
    }
    resp(['sala'=>$sala,'jogadores'=>$jogs,'jogo'=>$jogo]);

// ─── INICIAR JOGO ───────────────────────────────
case 'iniciar_jogo':
    $token=trim($in['token']??'');
    $codigo=strtoupper(trim($in['codigo']??''));
    $estado=$in['estado']??null;
    $db=db();
    $sess=$db->prepare("SELECT user_id FROM sessoes WHERE token=?");$sess->execute([$token]);$sess=$sess->fetch();
    if(!$sess)resp(['erro'=>'Não autenticado'],401);
    $sala=$db->prepare("SELECT * FROM salas WHERE codigo=?");$sala->execute([$codigo]);$sala=$sala->fetch();
    if(!$sala||$sala['host_id']!=$sess['user_id'])resp(['erro'=>'Apenas o anfitrião pode iniciar'],403);
    $db->prepare("UPDATE salas SET estado='jogando' WHERE codigo=?")->execute([$codigo]);
    $json=json_encode($estado,JSON_UNESCAPED_UNICODE);
    $db->prepare("INSERT INTO estado_jogo (sala_codigo,estado_json) VALUES (?,?) ON DUPLICATE KEY UPDATE estado_json=?,atualizado=NOW()")->execute([$codigo,$json,$json]);
    resp(['ok'=>true]);

// ─── ATUALIZAR ESTADO ───────────────────────────
case 'atualizar_estado':
    $codigo=strtoupper(trim($in['codigo']??''));
    $estado=$in['estado']??null;
    if(!$codigo||!$estado)resp(['erro'=>'Dados inválidos'],400);
    $db=db();
    $json=json_encode($estado,JSON_UNESCAPED_UNICODE);
    $db->prepare("INSERT INTO estado_jogo (sala_codigo,estado_json) VALUES (?,?) ON DUPLICATE KEY UPDATE estado_json=?,atualizado=NOW()")->execute([$codigo,$json,$json]);
    resp(['ok'=>true]);

// ─── SAIR / ABANDONAR ───────────────────────────
case 'sair_sala':
    $token=trim($in['token']??'');
    $codigo=strtoupper(trim($in['codigo']??''));
    $db=db();
    $sess=$db->prepare("SELECT user_id FROM sessoes WHERE token=?");$sess->execute([$token]);$sess=$sess->fetch();
    if(!$sess)resp(['erro'=>'Não autenticado'],401);
    // penalização se jogo em curso
    $sala=$db->prepare("SELECT estado FROM salas WHERE codigo=?");$sala->execute([$codigo]);$sala=$sala->fetch();
    if($sala&&$sala['estado']==='jogando'){
        $db->prepare("UPDATE utilizadores SET match_pts=GREATEST(0,match_pts-7) WHERE id=?")->execute([$sess['user_id']]);
    }
    $db->prepare("DELETE FROM jogadores WHERE sala_codigo=? AND user_id=?")->execute([$codigo,$sess['user_id']]);
    // se não há mais jogadores, apagar sala
    $cnt=$db->prepare("SELECT COUNT(*) as c FROM jogadores WHERE sala_codigo=?");$cnt->execute([$codigo]);
    if($cnt->fetch()['c']==0){
        $db->prepare("DELETE FROM salas WHERE codigo=?")->execute([$codigo]);
        $db->prepare("DELETE FROM estado_jogo WHERE sala_codigo=?")->execute([$codigo]);
    }
    resp(['ok'=>true]);

// ─── GUARDAR RESULTADO ──────────────────────────
case 'guardar_resultado':
    $codigo=strtoupper(trim($in['codigo']??''));
    $resultados=$in['resultados']??[]; // [{user_id, ganhou, pts}]
    $db=db();
    foreach($resultados as $r){
        if(!isset($r['user_id']))continue;
        $ganhou=(bool)($r['ganhou']??false);
        $pts=(int)($r['pts']??0);
        $db->prepare("UPDATE utilizadores SET match_pts=match_pts+?, vitorias=vitorias+?, derrotas=derrotas+? WHERE id=?")
           ->execute([$pts,$ganhou?1:0,$ganhou?0:1,$r['user_id']]);
    }
    $db->prepare("UPDATE salas SET estado='fim' WHERE codigo=?")->execute([$codigo]);
    resp(['ok'=>true]);

default:
    resp(['erro'=>'Ação desconhecida'],400);
}
?>
