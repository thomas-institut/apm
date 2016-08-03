<?php
/**
 * @file login.php
 * @brief Login page
 *
 * Process login attempts and shows a login page for the user
 * 
 *
 */

require_once 'webpage.php';
require_once 'apmdata.php';

/**
  * 1. Initialize database
  * @todo Move db initialization to a class function in rmpage
  */
try {
    $db = new apmData();
}
catch (Exception $e){
    $msg = $e->getMessage();
    $code = $e->getCode();
    $ep = new errorPage();
    if ($code == E_MYSQL)
        $ep->show("MySQL error", $msg);
    else if ($code == E_NO_TABLES)
        $ep->show($msg, "Try running the DB setup script.");
    die();
}

$loginAttempts = 0;
session_start();

if (isset($_GET['logout'])){
    session_unset();
    session_destroy();
    webPage::redirectToSelf();
    die();
}

if (isset($_POST['user'])){
    // Login attempt
    if ($db->usernameExists($_POST['user']) and password_verify($_POST['pwd'], $db->userPassword($_POST['user']))){
        // Success!
        $_SESSION['userid'] = $db->userId($_POST['user']);
        webPage::redirect('index.php');
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

$page = new webPage('Averroes Project Login', 'styles.css');

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
    <tr><td colspan="2" align="center"><h1><?php print $params['app_name_htmlart'];?></h1></td></tr>
    <tr><td>Username:</td><td><input type="text" name="user" size="10" required></td></tr>
    <tr><td>Password:</td><td><input type="password" name="pwd" size="10" required></tr>
    <tr><td colspan="2" align="center"><p><input type="submit" value="Login"></p></td></tr>
    </table>
</form>
</div>

<?php
$page->closeBody();
$page->closeHtml();
?>