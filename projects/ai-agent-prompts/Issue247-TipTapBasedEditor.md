# 1. Basic TipTap Editor

Implement a first version of a TranscriptionEditor React component using TipTap

- Install TipTap and dependencies

- Create a TranscriptionEditor component that uses TipTap and that implements
the following features currently supported by TranscriptionEditor.js:
  - Bold
  - Italic
  - Rubric
  - Abbreviation

Note that Bold, Italic and Rubric are simple formats. Rubric text is shown visually as bold blue in the editor.
Abbreviation, however, requires asking the user for the expansion of the selected text, a hand id (1, 2, 3, up to a 
configurable limit) and an optional editorial note.

The TranscriptionEditor component should have an `onChange` prop that is called whenever the editor content changes and
that passes the new content as a parameter.

- Create a test page for the new component under `src/www/test/pages`. Follow the example of the `splitPanelsTest` page:
an html file, and tsx file that imports the component and renders it.


### Follow up

I get the following error when I try to run the test page:

`Invalid hook call. Hooks can only be called inside of the body of a function component.`

It points to line 144 of `TranscriptionEditor.tsx`.

Fix this error.


# 2. Make the editor use JSON

Modify the TranscriptionEditor component to use JSON instead of html
for content. That is, it should pass JSON to the onChange prop instead of html
and the content prop should JSON as well. Modify the test page 
accordingly.

# 3. UI improvements

## 3.1 Add a clear format button

Modify the TranscriptionEditor component to add a clear format button. The
user should be able to clear the formatting of the selected text.

## 3.2 Fix button highlighting

There is a UI issue with the current version of the TranscriptionEditor component. Format buttons should
be highlighted when the user clicks on text that has the format. E.g., if a user click in the middle of 
a bold word, the bold button should be highlighted. Right now the button is only highlighted when the user
types something in the middle of the word. Fix this issue.

# 4. Dialog for abbreviation parameters

Implement and use a modal dialog to get the user to enter the abbreviation parameters. Use react-bootstrap components
for the dialog (Modal, Form, Button, etc.) Make this a separate component and import it into TranscriptionEditor.tsx.
The component's source code should be saved in the same directory as TranscriptionEditor.tsx.

# 5. Sic Button

Implement a Sic button that marks some text as Sic. This requires asking the user for the corrected text, the
hand and an optional editorial note. This is very similar to the Abbreviation button but with "correction" instead
of "expansion". The dialog for asking the user is therefore essentially the same as for the Abbreviation button. So
modify the current Abbreviation dialog to reuse it with Sic as well.

## Follow up

Change the names of the attributes in Abbreviation and Sic marks in the 
TranscriptionEditor component to reflect their purpose and to use camelCase. So, for example, 'handid' must be 'handId', 
'alttext' should be 'expansion', and 'extrainfo' should be 'editorialNote'. In Sic marks, 'alttext' should be 'correction', 
etc. Do not care about compatibility with the old TranscriptionEditor.js,
use better naming for the attributes.


---
*This is the end of the first long session with Junie on April 15, 2026. Around 2.5 hours of 
work. About 1.6 Jetbrains AI credits used.*


