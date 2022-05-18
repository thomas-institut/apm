/* 
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
/**
 * Author:  Rafael Nájera <rafael.najera@uni-koeln.de>
 * Created: Nov 2, 2017
 */


# Get docs for a user
SELECT DISTINCT ap_docs.* from ap_docs join (ap_elements, ap_pages) on (ap_elements.page_id=ap_pages.id and ap_docs.id=ap_pages.doc_id) where ap_elements.editor_id=23977

# Get pages for a doc/user

SELECT ap_pages.* from ap_pages join (ap_elements, ap_docs) on (ap_elements.page_id=ap_pages.id and ap_docs.id=ap_pages.doc_id) where ap_elements.editor_id=23977 and ap_