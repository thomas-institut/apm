<?php
/**
 * @file errorpage.php
 * 
 * Basic error page class
 * 
 * @author Rafael Nájera <rafael.najera@uni-koeln.de>
 */

require_once 'webpage.php';

/**
 * @class errorPage
 * @brief Error page for APM
 *
 * Provides a function that prints an error page.
 */

class errorPage extends webPage {

    /**
     * @brief Outputs an error page
     *
     * The error page consists of an error header and
     * two paragraphs:
     *  - An error description
     *  - An optional further message.
     *
     * @param string $msg Main error message
     * @param string $msg2 Optional additional error message
     */
    function show($msg, $msg2=''){
        $this->title = "APM Error!";
        $this->httpHeaderUtf();
        $this->printDocTypeAndHtml();
        $this->printHead();
        $this->startBody();
        $this->p("Error: " . $msg, "error");
        $this->p($msg2, "errorinfo");
        $this->closeBody();
        $this->closeHtml();
    }
}