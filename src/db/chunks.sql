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

# Get the doc info for the doc with a given chunk
SELECT DISTINCT ap_docs.*
FROM ap_docs 
JOIN (ap_elements, ap_items, ap_pages) 
ON (ap_elements.id=ap_items.ce_id AND ap_pages.id=ap_elements.page_id AND ap_docs.id=ap_pages.doc_id) 
WHERE ap_items.type=14 
    AND ap_items.text='AW47' 
    AND ap_items.target=44 
    AND ap_items.valid_until='9999-12-31 23:59:59.999999' 
    AND ap_elements.valid_until='9999-12-31 23:59:59.999999' 
    AND ap_pages.valid_until='9999-12-31 23:59:59.999999'


# Get the relevant doc, pag, element and item info to get the text of chunk in a doc
SELECT ap_pages.seq as 'page_seq', 
    ap_pages.foliation, 
    ap_elements.column_number, 
    ap_elements.seq as 'e_seq', 
    ap_items.seq as 'item_seq', 
    ap_items.alt_text as 'type' 
FROM ap_pages 
JOIN (ap_elements, ap_items) 
ON (ap_elements.id=ap_items.ce_id and ap_pages.id=ap_elements.page_id) 
WHERE ap_items.type=14 
    AND ap_items.text='AW47' 
    AND ap_items.target=44 
    AND ap_pages.doc_id=9
    AND ap_items.valid_until='9999-12-31 23:59:59.999999' 
    AND ap_elements.valid_until='9999-12-31 23:59:59.999999' 
    AND ap_pages.valid_until='9999-12-31 23:59:59.999999'

# In the test database this results in 
#  Doc 9, lang he
# page_seq, col, e_seq, item_seq, type
#   71, 1, 23, 2, start
#   72, 1, 16, 1, end

# With this info we can get the ordered list of items by creating 
# a sequence number for each item:  PPPCCEEII
# PPP: page sequence number
# CC: column number
# EE: element sequence number
# II: item sequence number
#
# So, in the example from 071012302  to 072011601

# Get an ordered list of items from page 242 col 01 ele_seq 00 item_seq 01
#  to page 242 col 01 ele_seq 19 item_seq 01
SELECT ap_items.* FROM ap_items 
JOIN (ap_elements, ap_pages) 
ON (ap_items.ce_id=ap_elements.id AND ap_elements.page_id=ap_pages.id) 
WHERE ap_items.valid_until='9999-12-31 23:59:59.999999' 
    AND ap_elements.valid_until='9999-12-31 23:59:59.999999' 
    AND ap_pages.valid_until='9999-12-31 23:59:59.999999' 
    AND (ap_pages.seq*1000000 + ap_elements.column_number*10000 + ap_elements.seq * 100 + ap_items.seq) > 71012302 
    AND (ap_pages.seq*1000000 + ap_elements.column_number*10000 + ap_elements.seq * 100 + ap_items.seq) < 72011601
    AND ap_pages.doc_id=9
ORDER BY ap_pages.seq, 
    ap_elements.column_number, 
    ap_elements.seq, 
    ap_items.seq ASC;


# This one takes much longer!
SELECT ap_items.* FROM ap_items 
JOIN (ap_elements, ap_pages) 
ON (ap_items.ce_id=ap_elements.id AND ap_elements.page_id=ap_pages.id) 
WHERE ap_items.valid_until='9999-12-31 23:59:59.999999' 
    AND ap_elements.valid_until='9999-12-31 23:59:59.999999' 
    AND ap_pages.valid_until='9999-12-31 23:59:59.999999' 
    AND (ap_pages.seq*1000000 + ap_elements.column_number*10000 + ap_elements.seq * 100 + ap_items.seq) > 58010000 
    AND (ap_pages.seq*1000000 + ap_elements.column_number*10000 + ap_elements.seq * 100 + ap_items.seq) < 58010500
    AND ap_pages.doc_id=4
ORDER BY ap_pages.seq, 
    ap_elements.column_number, 
    ap_elements.seq, 
    ap_items.seq ASC
