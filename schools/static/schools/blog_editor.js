// Turns the "Article" box in Admin > Blog posts into a visual editor (bold, headings, lists, links, tables).
document.addEventListener('DOMContentLoaded', function () {
  var el = document.querySelector('textarea.vv-blog-editor');
  if (!el || typeof ClassicEditor === 'undefined') return;
  ClassicEditor.create(el, {
    toolbar: ['heading', '|', 'bold', 'italic', 'link', '|', 'bulletedList', 'numberedList', 'blockQuote', 'insertTable', '|', 'undo', 'redo'],
    heading: {
      options: [
        { model: 'paragraph', title: 'Paragraph', class: 'ck-heading_paragraph' },
        { model: 'heading2', view: 'h2', title: 'Heading', class: 'ck-heading_heading2' },
        { model: 'heading3', view: 'h3', title: 'Sub-heading', class: 'ck-heading_heading3' },
      ],
    },
  }).then(function (editor) {
    editor.editing.view.change(function (writer) {
      writer.setStyle('min-height', '420px', editor.editing.view.document.getRoot());
    });
  }).catch(function (e) { console.error(e); });
});
