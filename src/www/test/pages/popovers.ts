import {withPopover} from "@/widgets/Popover";

window.addEventListener('load', () => {

  const container = document.createElement('div');
  container.id = 'popover-container';
  container.classList.add('buttonsDiv');
  document.body.appendChild(container);

  const positions = ['top', 'bottom', 'left', 'right', 'auto'];

  ['T', 'B', 'L', 'R', 'A'].forEach((title, index) => {
    const button = document.createElement('button');
    button.innerHTML = title;
    button.id = `button-${index}`;
    container.appendChild(button);

    const getContent = async () => {
      return `
       <h3>Popover ${title}</h3>
      <p>This is the popover for button ${title}</p>
      <p>TS is ${Date.now()}</p>
      `;
    };

    withPopover(button, {
      trigger: 'hover',
      // @ts-ignore
      position: positions[index] ?? 'auto',
      content: getContent,
      popoverClass: 'myPopover',
      arrowBackgroundColor: { bottom: 'gainsboro'}
    });
  });

});


