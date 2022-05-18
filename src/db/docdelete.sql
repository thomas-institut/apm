/**

MySQL statements to delete transcription data associated with a document

*/


-- First, delete the ednotes associated with the items
DELETE ap_ednotes FROM ap_ednotes
INNER JOIN ap_items ON ap_ednotes.target=ap_items.id
INNER JOIN ap_elements ON ap_items.ce_id=ap_elements.id
INNER JOIN ap_pages ON ap_elements.page_id=ap_pages.id
INNER JOIN ap_docs ON ap_pages.doc_id=ap_docs.id
WHERE ap_elements.valid_until > '2018-01-01'  -- In order to avoid duplicate element rows in the JOIN
    AND ap_ednotes.type = 2
    AND ap_docs.id = {{DOC_ID}};


-- Then, delete items
DELETE ap_items FROM ap_items 
INNER JOIN ap_elements ON ap_items.ce_id=ap_elements.id
INNER JOIN ap_pages ON ap_elements.page_id=ap_pages.id
INNER JOIN ap_docs ON ap_pages.doc_id=ap_docs.id
WHERE ap_elements.valid_until > '2018-01-01' 
    AND ap_docs.id = {{DOC_ID}};

-- Then, delete elements
DELETE ap_elements FROM ap_elements
INNER JOIN ap_pages ON ap_elements.page_id=ap_pages.id
INNER JOIN ap_docs ON ap_pages.doc_id=ap_docs.id
WHERE ap_docs.id = {{DOC_ID}};
