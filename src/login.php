<?php
/**
 * @file login.php
 * @brief Login page
 *
 * Process login attempts and shows a login page for the user
 * 
 * @author Rafael Nájera <rafael.najera@uni-koeln.de>
 */

require_once 'config.php';
require_once 'params.php';
require_once 'webpage.php';
require_once 'apdata.php';


/**
  * 1. Initialize database
  */ 
try {
    $db = new ApData($config, $params['tables']);
}
catch (Exception $e){
    $msg = $e->getMessage();
    $code = $e->getCode();
    $ep = new ErrorPage();
    if ($code == E_MYSQL)
        $ep->show("MySQL error", $msg);
    else if ($code == E_NO_TABLES)
        $ep->show($msg, "Try running the DB setup script.");
    die();
}

$loginAttempts = 0;
ini_set('session.gc_maxlifetime', 86400);
session_start(['cookie_lifetime' => 86400,]);

if (isset($_GET['logout'])){
    session_unset();
    session_destroy();
    WebPage::redirectToSelf();
    die();
}

/**
 * Try to authenticate the user.
 * 
 * password_verify checks against the hash in the database
 * a hash can be generated with  mkpasswd --method=sha-512
 */

if (isset($_POST['user'])){
    // Login attempt
    if ($db->usernameExists($_POST['user']) and password_verify($_POST['pwd'], $db->userPassword($_POST['user']))){
        // Success!
        $_SESSION['userid'] = $db->getUserIdByUsername($_POST['user']);
        WebPage::redirect('index.php');
        die();
    }
    else{
        // No main page for you!
        session_unset();
        session_destroy();
        $loginAttempts = 1;
    }
}

session_unset();
session_destroy();

$page = new WebPage('Averroes Project Login', 'css/styles.css');
$page->addStylesheet("https://fonts.googleapis.com/css?family=PT+Sans");

$page->httpHeaderUtf();
$page->printDocTypeAndHtml();
$page->printHead();
$page->startBody();
?>
<div id="login">
<?php
if ($loginAttempts > 0){
    $page->p("Wrong username or password. Try again!", 'red');
}
?>

   <form action="<?php echo $_SERVER["PHP_SELF"];?>" method="post">
    <table>
        <tr><td colspan="2" align="center"><img src="images/averroes-logo-400.png"></td></tr>
        <tr><td colspan="2">&nbsp;</td></tr>
         <tr><td colspan="2">&nbsp;</td></tr>
    <tr><td>Username:</td><td align="right"><input class="logininput" type="text" name="user" size="10" required></td></tr>
     <tr><td colspan="2">&nbsp;</td></tr>
    <tr><td>Password:</td><td align="right"><input class="logininput" type="password" name="pwd" size="10" required></tr>
    <tr><td colspan="2" align="right"><p><input class="logininput" type="submit" value="Login"></p></td></tr>
    </table>
</form>
</div>

<?php
$page->closeBody();
$page->closeHtml();
?>