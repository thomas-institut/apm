<?php
/**
 * @file apmpage.php
 * 
 * @brief Basic Averroes Project Manager page classs
 * @author Rafael Nájera <rafael.najera@uni-koeln.de>
 * 
 */

require_once 'webpage.php';
require_once 'errorpage.php';

if (!file_exists('config.php')){
    $ep = new ErrorPage();
    $ep->show("No configuration file", "Tell your admin to configure the system");
    die();
}
require_once 'config.php';

if (!file_exists('params.php')){
    $ep = new ErrorPage();
    $ep->show("No parameters file", "Tell your admin to configure the system");
    die();
}
require_once 'params.php';

require_once 'apdata.php';

/**
 * @class ApPage
 * @brief Basic APM page.
 * 
 * Parent class for all normal APM pages. Children classes
 * normally would only have to provide a function to fill in the
 * body of the page.
 */

class ApPage extends WebPage {

    /**
     * Database access 
     * @var ApData $db 
     */
    public $db;

    /**
     * User info
     * @var array $user
     */
    protected $user;

      /**
     * page URL
     */
    protected $pageUrl;

    /**
     * Some constants
     */
    const manageIcon = '&#x1f4dd;';
    const logoutIcon = '&#x279f;';
    const editIcon = '&#x270e;';
    const deleteIcon = '&#x2718;';
    const goBackIcon = '&#x1f519;';

    const largeFontDiv = '<div style="font-size:2em;">';
    const goBackIconLarge = self::largeFontDiv . self::goBackIcon . '</div>';
    
    /**
     * @brief Class constructor
     * @param string $title Mandatory page title
     */
    function __construct($title, $pageUrl=''){
        global $params;
        global $config;

        /**
         * 1. Call webPage's constructor
         */
        parent::__construct($title);
        // Add jQuery
        $this->addScript('jquery-3.1.1.js');
        $this->addScript('jquery-ui.js');
        $this->addStylesheet('jquery-ui.css');
        $this->addStylesheet("https://fonts.googleapis.com/css?family=PT+Sans");
        /**
         * 2. Initialize database
         */
        try {
            $this->db = new ApData($config, $params['tables']);
        }
        catch (Exception $e){
            $msg = $e->getMessage();
            $code = $e->getCode();
            $ep = new ErrorPage();
            switch($code){
                case E_MYSQL:
                    $ep->show("MySQL error", $msg);
                    break;
                
                case E_NO_TABLES:
                    $ep->show($msg, "Tell your admin to run the DB creation script.");
                    break;
                
                case E_OUTDATED_DB:
                    $ep->show($msg, "Tell your admin to upgrade the DB");
                    break;
                
                default:
                    $ep->show("Oops, an error!", $msg);
            }
            die();
        }
        /** 
         * 3. See if there's a user session going on, if not, show the
         * login page
         */
        ini_set('session.gc_maxlifetime', 86400);
        session_start(['cookie_lifetime' => 86400,]);
//        session_start();
        if (!isset($_SESSION['userid'])){
            $this->redirect('login.php');
            die();
        }

        /**
         * 4. Load user info
         */
        
        $this->user = $this->db->loadUserInfo($_SESSION['userid']);

       
        
       	date_default_timezone_set($params['default_timezone']);
         /**
         * 5. Set the page's title and URL
         */
        $this->title = $params['app_shortname'] . " - " . $title;
        $this->pageUrl = $pageUrl;
        
      
    }
    
    /**
     * @brief Finishes the page.
     *
     * Prints the footer and closes <body> and <html> tags.
     */
    function closePage(){
        $this->printFooter();
        $this->closeBody();
        $this->closeHtml();
    }
        
    /**
     * @brief Starts the page
     * 
     * Outputs the http header, the initial doctype and html
     * tags, head and page header
     */
    function startPage(){
        $this->httpHeaderUtf();
        $this->printDocTypeAndHtml();
        $this->printHead();
        $this->startBody();
        $this->printHeader();
    }

    /**
     * Prints a standard "Go Back" link
     * If no URL is given the function tries to set it as the
     * HTTP referer, the page URL or, last resort, index.php
     */
    protected function goBackButton($url='', $large = TRUE, $title='Go Back'){
        if ($url == '')
            if (isset($_SERVER['HTTP_REFERER']))
                $url = $_SERVER['HTTP_REFERER'];
            else
                if ($this->pageUrl == '')
                    $url = 'index.php';
                else
                    $url = $this->pageUrl;
        if ($large)
            $icon = self::goBackIconLarge;
        else
            $icon = self::goBackIcon;
        
        return '<a href="' . $url . '" title="' . $title . '">' . $icon  . '</a>';
    }

    /**
     * @brief Utility function to print the standard apm header
     * 
     */
    protected function printHeader(){
        global $params;
        $this->startTag('header');
        $this->startDiv("header-wrap");
?>
<p class="logo"><a href="index.php"><img src="images/averroes-logo-250.png"></a></p>
        <div id="nav">
            <ul class="horizontal">
                <li><a href="https://thomas-institut.github.io/averroes-workflow-guidelines/">Worflow Guidelines<span class="ui-icon ui-icon-extlink"></span></a></li>
                <li><a href="https://thomas-institut.github.io/averroes-tei/averroes-guidelines.html">TEI Guidelines<span class="ui-icon ui-icon-extlink"></span></a></li>
                <li><a href="https://wiki.uni-koeln.de/averroes_project/">Wiki <span class="ui-icon ui-icon-extlink"></span></a></li>
                <li style="padding-left: 60px;">User: <b><?php print $this->user['username']?></b>
                    <a href="login.php?logout" title="Logout" id="logout"><img src="images/exit-1.png" height="16"></a>
                </li>
            </ul>
        </div>
  <!--
  <script>
            $( "#usermenu" ).menu({
                icons: { submenu: "ui-icon-triangle-1-s" }
            });
        </script>
  -->
            
<?php
        $this->closeLastTag(); // div header-wrap
        $this->closeLastTag(); // header
    }

     /**
     * @brief Utility function to print the standard APM footer
     * 
     */
    protected function printFooter(){
        global $params;

        $this->startTag('footer');
        $this->p($params['app_name'] . " " . $params['version'] . " &bull; &copy; " . $params['copyright_notice'] . " &bull; " .  strftime("%d %b %Y, %H:%M:%S %Z"));
        $this->closeLastTag();
    }
        

  
}