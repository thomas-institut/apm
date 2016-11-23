<?php
/**
 * @file webpage.php
 * 
 * @brief Basic webpage class
 * 
 * @author Rafael Nájera <rafael.najera@uni-koeln.de>
 */


/**
 * @class webPage
 * @brief Encapsulates basic webpage functions
 */

use \Psr\Http\Message\ResponseInterface as Response;

class WebPage {

    
    /**
     *
     * @var Response
     */
    protected $r; 
    /**
     * @var string $lang 
     * @brief Language to declare in the <html> tag
     */
    protected $lang;
    
    /**
     * @var array $styles 
     * @brief Filenames of stylesheets to include in html <header>
     * @todo Define also a media type for styles
     */
    protected $styles;

    /**
     * @var string $title
     * @brief Page title
     */
    protected $title;

    /**
     * @var array $scripts
     * @brief Filenames of scripts to include in html <header>
     */
    protected $scripts;

    /** 
     * @private array $openTags 
     * @brief Stack of tags 
     */
    private $openTags;

    /**
     * @brief Class constructor
     *
     * @param string $title Optional page title
     * @param string $style Optional styleshee filename
     * @param string $language Optional page language
     * @param string $script Optional script to include
     * 
     */
    function __construct($resp, $title='', $style='styles.css', $language = 'en-US',
                     $script = '' ){
        $this->r = $resp;
        $this->lang = $language;
        $this->title = $title;
        $this->styles = array();
        $this->openTags = array();
        if ($style != '')
            array_push($this->styles, $style);
        $this->scripts = array();
        if ($script != '')
            array_push($this->scripts, $script);
    }
    
    function write($str){
        $this->r->getBody()->write($str);
    }
    /**
     * @brief Prints doctype and html tags
     */
    function printDocTypeAndHtml(){
        $this->write("<!doctype html>\n");
        if ($this->lang != '') {
            $this->write("<html lang=\"" . $this->lang . "\">\n");
        } else {
            $this->write("<html>\n");
        }
    }

    /**
     * Adds a script to the list
     */
    function addScript($scriptSource){
        array_push($this->scripts, $scriptSource);
    }
    
    /**
     * Adds a stylesheet to the list
     */
    function addStylesheet($stylesheetURI){
        array_push($this->styles, $stylesheetURI);
    }
  
    /**
     * @brief Redirects to a new page immediately
     */
    static function redirect($url){
        $this->r = $this->r->withHeader('Location',$url);
    }
    
    /**
     * @brief Redirects to itself
     */
    static function redirectToSelf(){
        $this->r = $this->r->withHeader('Location', $_SERVER["PHP_SELF"]);
    }

    /** 
     * @brief Sets the page language 
     *
     * This only makes sense before sending out the <html> tag!
     */
    function setLang($theLang){
        $this->lang = $theLang;
    }

    /**
     * @brief Sends an http header specifying UTF-8 output
     */
    function httpHeaderUtf(){
       	$this->r = $this->r->withHeader('Content-Type', 'text/html; charset=utf-8');
    }

    /**
     * @brief Prints the <head> section.
     * 
     * Prints all stylesheet and script references
     */
    function printHead(){
        $this->write("<head>\n");
        foreach ($this->styles as $st) {
            $this->write("<link rel=\"stylesheet\" type=\"text/css\" href=\"" . 
                $st . "\"/>\n");
        }
        $this->write("<title>" . $this->title . "</title>\n");
        foreach( $this->scripts as $sc){
            $this->write("<script type=\"text/javascript\" src=\"" .
                $sc . "\"></script>\n");
        }
        $this->write("</head>\n");
    }

    /**
     * @brief Prints the <body> tag
     */
    function startBody($class=''){
        /** 
         * Notice that this implemenation will leave a <body> tag in the tag stack
         * which shouldn't be a problem
         */
        $this->startTag('body', $class);
    }

    /**
     * @brief Closes the <body> tag
     */
    function closeBody(){
        $this->write("</body>\n");
    }

   /**
     * @brief Closes the <html> tag
     */

    function closeHtml(){
        $this->write("</html>");
    }

    /**
     * @brief Prints an html paragragh with the given content
     * 
     * @param string $text Text inside the \<p> tag
     * @param string $class Optional class
     */
    function p($text, $class=''){
        $this->startTag('p', $class);
        $this->write($text);
        $this->closeLastTag();
 
    }

    /**
     * Starts a <div> tag with the given id
     * @param string $id ID
     * @param string $class Optional class
     */
    function startDiv($id, $class=''){
        $this->write("<div id=\"" . $id . "\"");
        if ($class != '') {
            $this->write(" class=\"" . $class . "\" ");
        }
        $this->write(">");
        array_push($this->openTags, 'div');

    }

    /**
     * Prints a tag with an optional class
     *
     * Puts the tag in a stack so that it can be closed
     * later on with closeLastTag()
     *
     * @param string $tag Tag to open
     * @param string $class Optional class for the element
     */
    function startTag($tag, $class=''){
        array_push($this->openTags, $tag);
        if ($class != '') {
            $this->write('<' . $tag . " class=\"" . $class . "\">");
        } else {
            $this->write('<' . $tag . ">");
        }
    }

    /**
     * @brief Closes the last tag printed with startTag()
     */
    function closeLastTag(){
        $lt = array_pop($this->openTags);
        $this->write("</" . $lt . ">\n");
    }
    
    /**
     * Returns the IP address
     */
    function getIpAddress(){
        $ip = $_SERVER['REMOTE_ADDR'];
        if ($ip == '::1'){
            return '127.0.0.1';
        }
        return $ip;
    }
    
    function getResponse(){
        return $this->r;
    }
}
