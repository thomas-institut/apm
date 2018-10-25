<?php

/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */

namespace APM\Core;

/**
 * Description of Page
 *
 * @author Rafael Nájera <rafael.najera@uni-koeln.de>
 */
class Page { 
    
    const PAGE_UNKNOWN = 0;
    const PAGE_TEXT = 1;
    const PAGE_FRONTMATTER = 2;
    const PAGE_BACKMATTER = 3;
    
    /**
     * These members are about the page per se
     */
    private $type;
    private $defaultLanguage;
    private $foliation;
    
    /**
     * These are about the page in the system
     * The question is whether we need to leave this to a subclass
     * Is there any use case for a page without this information? 
     */
    
    private $sequenceNumber;
    private $pageNumber;
    private $imageInfo;
    
    /**
     * A page can be modelled in several ways. The goal of the model is
     * to be able to capture the transcription of the text of the page
     * in such a way that the text can be located in the physical page. Indeed,
     * the document-and-page structure itself is in essence a model of what
     * we need in a transcription: a text that corresponds to particular 
     * impressions or scriblings in a manuscript. 

     * 
     * In a physical model, pages are 2-dimensional objects composed  
     * graphical regions of interest. 
     * 
     * These regions can be arranged
     * in a tree structure
     * 
     *   page * text box * line * word * gliph
     *        |          |      |
     *        |          |      * empty horizontal space
     *        |          * empty vertical space
     *        * image box 
     * 
     * 
     * From a transcription point of view there are textual items 
     * that contain one or more main texts with glosses, additions and other 
     * annotations, plus marks and notes entered by the transcriber.  The goal is to 
     * be able to get the transcription of a chunk of text automatically and
     * to refer each and every word to a location in the page.
     * 
     * From the physical model it should be possible to extract the transcription
     * model provided the different graphical elements are linked together 
     * in textual streams. For example, 
     *    main text = textbox[1].text + textbox[2].text + textbox[3].text
     * 
     *    textbox[1].text  = line[1].text + line[2].text + .... + line[n].text
     * 
     *    line[n].text = word[1].text + word[2].text + ...
     *    word[n].text = gliph[1].text + ...
     * 
     * In general, a textbox is a bounded figure with other bounded figures inside
     * that for transcription purposes are ordered in some way. Text is reconstructed
     * by traversing the tree of text boxes. 
     * 
     * Some textboxes may be related by references, for example,
     * an addition needs to be related to a mark in the text where it should
     * included. This is necessary for the transcription model.
     * 
     * There might be more complex structures, e.g., tables, that are ultimately
     * only different arrangements of text boxes, beyond the simple linear
     * sequence.
     * 
     * The most common situation, however, is much simpler. Normally pages
     * only have text boxes that are either columns of text containing
     * only one main text or marginalia that is textually related to either 
     * the page itself (page numbers, custodes, etc) or to text in one of 
     * the column (marginal additions and glosses). Furthermore, there is usually
     * no need to capture the precise coordinates of all graphical elements but
     * only the relative placements of some textual items such as additions and 
     * glosses.  
     * 
     * 
     * 
     */
    private $textBoxes;
    
    public function getData() {
        return $this->data;
    }
    
    public function setData($d) { 
        $this->data = $d;
    } 
    
    public function getColumnCount() {
        return count($this->columns);
    }
    
    
} 
