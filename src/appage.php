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
        $this->addScript('bootstrap.js');
        $this->addStylesheet('css/bootstrap.css');
        $this->addStylesheet("https://fonts.googleapis.com/css?family=PT+Sans");
        $this->addStylesheet('stickyfooter.css');
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

?>
    <nav class="navbar navbar-default navbar-static-top" style="background-color: white;">
        <div class="container">
            <div class="navbar-header">
                <a class="navbar-brand" style="padding:0;" href="#"><img src="images/averroes-logo-250.png" height="50" ></a>
            </div>
            <div id="navbar" class="navbar-collapse collapse">
                <ul class="nav navbar-nav">
                    <li class="dropdown">
                        <a href="#" class="dropdown-toggle" data-toggle="dropdown" role="button" aria-haspopup="true" aria-expanded="false">Info<span class="caret"></span></a>
                        <ul class="dropdown-menu">
                            <li><a href="https://thomas-institut.github.io/averroes-workflow-guidelines/">Worflow Guidelines &nbsp;<span class="glyphicon glyphicon-new-window"></span></a></li>
                            <li><a href="https://thomas-institut.github.io/averroes-tei/averroes-guidelines.html">TEI Guidelines &nbsp;<span class="glyphicon glyphicon-new-window"></span></a></li>
                            <li><a href="https://wiki.uni-koeln.de/averroes_project/">Wiki &nbsp;<span class="glyphicon glyphicon-new-window"></span></a></li>
                        </ul>
                    </li>
                </ul>
                <ul class="nav navbar-nav navbar-right">
                    <li class="dropdown">
                        <a href="#" class="dropdown-toggle" data-toggle="dropdown" role="button" aria-haspopup="true" aria-expanded="false">
                            <span class="glyphicon glyphicon-user" aria-hidden="true">&nbsp;</span><?php print $this->user['username'] ?><span class="caret"></span></a>
                        <ul class="dropdown-menu">
                            <li><a href="#">Settings</a></li>
                            <li role="separator" class="divider"></li>
                            <li><a href="login.php?logout" title="Logout">Logout</a></li>
                        </ul>
                    </li>
                </ul>
            </div><!--/.nav-collapse -->
        </div>
    </nav>
<?php

    }

     /**
     * @brief Utility function to print the standard APM footer
     * 
     */
    protected function printFooter(){
        global $params;

        print '<footer class="footer">';print "\n";
        print '<div class="container">';print "\n";
        $this->p($params['app_name'] . " " . $params['version'] . " &bull; &copy; " . $params['copyright_notice'] . " &bull; " .  strftime("%d %b %Y, %H:%M:%S %Z"), 'text-muted');
        print '</div>';
        print '</footer>';
        print "\n";
    }
        
    /**
     * Overrides webpage's version to add metas needed by Bootstrap
     * TODO: this could be done more elegantly.
     */
    function printHead(){
        print "<head>\n";
        print "<meta charset=\"utf-8\">\n";
        print "<meta http-equiv=\"X-UA-Compatible\" content=\"IE=edge\">\n";
        print "<meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">\n";
        
        foreach ($this->styles as $st) {
            print "<link rel=\"stylesheet\" type=\"text/css\" href=\"" . 
                $st . "\"/>\n";
        }
        print "<title>" . $this->title . "</title>\n";
        foreach( $this->scripts as $sc){
            print "<script type=\"text/javascript\" src=\"" .
                $sc . "\"></script>\n";
        }
        print "</head>\n";
    }

  
}