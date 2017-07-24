/* 
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
/**
 * Author:  Rafael Nájera <rafael.najera@uni-koeln.de>
 * Created: Jul 21, 2017
 */

# Get a list of chunk items ordered by doc, page, column, element seq, item seq

SELECT ap_items.text AS 'work', 
    ap_items.target as 'chunk_no', 
    ap_items.alt_text as 'type', 
    ap_pages.doc_id as 'doc_id', 
    ap_pages.id as 'page_id',
    ap_pages.page_number as 'page_number', 
    ap_elements.column_number as 'col', 
    ap_elements.seq as 'ele_seq', 
    ap_items.seq as 'item_seq', 
    (ap_pages.page_number*1000000 + ap_elements.column_number*10000 + ap_elements.seq * 100 + ap_items.seq) as 'item_pos'
FROM `ap_items` 
JOIN (ap_elements, ap_pages) 
ON (ap_items.ce_id=ap_elements.id AND ap_elements.page_id=ap_pages.id) 
WHERE ap_items.type=14 
    AND ap_items.valid_until='9999-12-31 23:59:59.999999' 
    and ap_elements.valid_until='9999-12-31 23:59:59.999999' 
    and ap_pages.valid_until='9999-12-31 23:59:59.999999' 
ORDER BY ap_pages.doc_id, 
    ap_pages.page_number, 
    ap_elements.column_number, 
    ap_elements.seq, 
    ap_items.seq ASC;

# Get an ordered list of items from page 242 col 01 ele_seq 00 item_seq 01
#  to page 242 col 01 ele_seq 19 item_seq 01

SELECT ap_items.* FROM ap_items 
JOIN (ap_elements, ap_pages) 
ON (ap_items.ce_id=ap_elements.id AND ap_elements.page_id=ap_pages.id) 
WHERE ap_items.valid_until='9999-12-31 23:59:59.999999' 
    AND ap_elements.valid_until='9999-12-31 23:59:59.999999' 
    AND ap_pages.valid_until='9999-12-31 23:59:59.999999' 
    AND (ap_pages.page_number*1000000 + ap_elements.column_number*10000 + ap_elements.seq * 100 + ap_items.seq) > 242010001 
    AND (ap_pages.page_number*1000000 + ap_elements.column_number*10000 + ap_elements.seq * 100 + ap_items.seq) < 242011901
    AND ap_pages.doc_id=5
ORDER BY ap_pages.page_number, 
    ap_elements.column_number, 
    ap_elements.seq, 
    ap_items.seq ASC;