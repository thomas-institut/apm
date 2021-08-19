import Quill from 'quill/core';
import Bold from 'quill/formats/bold';
import Italic from 'quill/formats/italic';


Quill.register({
  'formats/bold': Bold,
  'formats/italic': Italic,
}, true);

export default Quill;
