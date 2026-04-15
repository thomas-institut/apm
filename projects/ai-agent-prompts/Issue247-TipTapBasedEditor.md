# First Task: Basic TipTap Editor

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
