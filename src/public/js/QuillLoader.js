import Quill from 'quill/core';
import Bold from 'quill/formats/bold';
import Italic from 'quill/formats/italic';
import Header from 'quill/formats/header'


Quill.register({
  'formats/bold': Bold,
  'formats/italic': Italic,
  'formats/header': Header
}, true);

export default Quill;
