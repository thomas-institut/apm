/**

MySQL statements to delete transcription data associated with a column

need: {{Page Id}} and {{Column Number}}

*/


-- First, delete the ednotes associated with the items
DELETE ap_ednotes FROM ap_ednotes
INNER JOIN ap_items ON ap_ednotes.target=ap_items.id
INNER JOIN ap_elements ON ap_items.ce_id=ap_elements.id
WHERE ap_elements.valid_until > '2018-01-01'  -- In order to avoid duplicate element rows in the JOIN
    AND ap_ednotes.type = 2
    AND ap_elements.page_id = {{PageId}}
    AND ap_elements.column_number = {{ColumnNumber}};


-- Then, delete items
DELETE ap_items FROM ap_items 
INNER JOIN ap_elements ON ap_items.ce_id=ap_elements.id
WHERE  ap_elements.page_id = {{PageId}}  AND ap_elements.column_number = {{ColumnNumber}};

-- Then, delete elements
DELETE FROM ap_elements
WHERE  ap_elements.page_id = {{PageId}}  AND ap_elements.column_number = {{ColumnNumber}};
