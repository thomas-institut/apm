<?php
/**
 * @file apmpage.php
 * 
 * @brief Basic Averroes Project Manager page classs
 * @author Rafael Nájera <rafael.najera@uni-koeln.de>
 * 
 */

require_once 'config.php';
require_once 'params.php';
require_once 'webpage.php';
require_once 'errorpage.php';
require_once 'apmdata.php';

/**
 * @class apmPage
 * @brief Basic APM page.
 * 
 * Parent class for all normal APM pages. Children classes
 * normally would only have to provide a function to fill in the
 * body of the page.
 */

class apmPage extends webPage {

    /**
     * Database access 
     * @var apmData $db 
     */
    protected $db;

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

        /**
         * 1. Call webPage's constructor
         */
        parent::__construct($title);
        // Add jQuery
        $this->addScript('jquery.js');
        $this->addStylesheet("https://fonts.googleapis.com/css?family=Lato:300|Rakkas|Source+Sans+Pro");
        /**
         * 2. Initialize database
         */
        try {
            $this->db = new apmData();
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
        /** 
         * 3. See if there's a user session going on, if not, show the
         * login page
         */
        session_start();
        if (!isset($_SESSION['userid'])){
            $this->redirect('login.php');
            die();
        }

        /**
         * 4. Load user info
         */
        
        $this->db->loadUserInfo($_SESSION['userid'], $this->user);

       
        
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
        <p class="logo"><a href="index.php">Averroes Project</a></p>
        <div id="nav">
            <ul class="horizontal">
                <li><a href="https://thomas-institut.github.io/averroes-workflow-guidelines/">Worflow Guidelines <span class="icon">&#129109;</span></a></li>
                <li><a href="https://thomas-institut.github.io/averroes-tei/averroes-guidelines.html">TEI Guidelines <span class="icon">&#129109;</span></a></li>
                <li><a href="https://wiki.uni-koeln.de/averroes_project/">Wiki <span class="icon">&#129109;</span></a></li>
                <li>Collaborators</li>
                <li style="padding-left: 60px;">User: <a>rafael <span class="icon">&#x25bc;</span></a></li>
            </ul>
        </div>
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