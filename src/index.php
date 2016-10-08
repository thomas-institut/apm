<?php
/**
 * @file index.php
 * @brief Entry point for APM
 * @author Rafael Nájera <rafael.najera@uni-koeln.de>
 * 
 * 
 * This is the first skeleton version of the app, at this point it just 
 * provides a simple login page and shows a fake list of documents.
 * 
 */

require 'appage.php';

$page = new ApPage('Home');

$page->startPage(); ?>
 <section id="myassigments">
            <h1>My Assignments</h1>
            <article id="mydocs-mss01" class="mssfeedentry draft">
                <p><em>mss01</em> MSS [DRAFT]</p>
            </article>
            <article id="mydocs-mss02" class="mssfeedentry draft">
                <p><em>mss02</em> MSS [DRAFT]</p>
            </article>
        </section>
        <section id="alldocs">
            <h1>All Documents</h1>
            <article id="alldocs-BOOK-DARE-M-DE-BER-SB-Or.Qu.811" class="mssfeedentry draft">
                <p><span class="doctitle">Berlin Staatsbibliothek Or. Qu. 811</span> &bull; Hebrew Manuscript</p>
                <p>Draft</p>
                <ul>
                <li>Header: <a>Rafael Nájera</a></li>
                <li> Pages 0128 to 0130, section On heart, assigned to <a>Tamás Visi</a></li>
                 <li> Pages 0368 to 0370, section On Liver, assigned to <a>Tamás Visi</a></li>
                 </ul>
            </article>
            <article id="alldocs-BOOK-DARE-M-DE-BER-SB-Or.Qu.812" class="mssfeedentry draft">
                <h2>Berlin Staatsbibliothek Or. Qu. 811</h2>
                <ul>
                <li>Hebrew Manuscript &bull; Draft</li>
                <li>Header assigned to <a>Rafael Nájera</a></li>
                <li>Parts:
                    <ul>
                    <li> Pages 0128 to 0130: section On heart, assigned to <a>Tamás Visi</a></li>
                    <li> Pages 0368 to 0370, section On Liver, assigned to <a>Tamás Visi</a></li>
                    </ul>
                </li>
                </ul>
            </article>
             <article id="alldocs-BOOK-DARE-M-FR-PAR-BFL-lat.14385" class="mssfeedentry draft">
                <h2>Bibliotheque National de France lat.14385</h2>
                <ul>
                <li>Latin Manuscript &bull; Draft</li>
                <li>Header assigned to <a>Rafael Nájera</a></li>
                <li>Parts:
                    <ul>
                    <li> Pages 0128 to 0130, section On heart, assigned to <a>Grégory Clesse</a></li>
                    <li> Pages 0368 to 0370, section On Liver, assigned to <a>Grégory Clesse</a></li>
                    </ul>
                </li>
                </ul>
            </article>           
            

        </section>


<?php

$page->closePage();

?>