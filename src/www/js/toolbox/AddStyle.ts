/**
 * Adds a style to the document head
 * @param style
 */
export function addStyle(style: string) {
  const styleElement = document.createElement('style');
  styleElement.innerHTML = style;
  document.head.appendChild(styleElement);
}
