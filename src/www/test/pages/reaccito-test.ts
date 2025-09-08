import {createElement, mount} from "@/experimental/Reaccito/Reaccito";
import {SimpleLockManager} from "@/toolbox/SimpleLockManager";


mount(Test, {name: 'World'}, document.getElementById('container')!).then(() => console.log("Test mounted"));


interface TestProps {
  name: string;
}


async function Test(props: TestProps) {
  return createElement('div', null, [`Hello ${props.name}!`]);
}


// How to implement refs?


interface Fiber {
  instance: string;
  currentHookIndex: number;
  hooks: any[];
}

class Hook {
  type: 'state'|'other' = 'state';
  value: any = null;

  constructor(type: 'state'|'other', value: any) {
    this.type = type;
    this.value = value;
  }
}

const fibersByInstance: Map<string, Fiber> = new Map();
const lockManager = new SimpleLockManager();

let currentInstance: string | null = null;

function getNextHook(): Hook | null {
  if (currentInstance === null) {
    throw new Error("useRef: currentInstance is null");
  }
  const fiber = fibersByInstance.get(currentInstance);
  if (fiber === undefined) {
    throw new Error("useRef: fiber is undefined");
  }
  fiber.currentHookIndex++;
  return fiber.hooks[fiber.currentHookIndex] ?? null;
}

function addHook(hook: Hook): Hook {
  if (currentInstance === null) {
    throw new Error("addHook: currentInstance is null");
  }
  const fiber = fibersByInstance.get(currentInstance);
  if (fiber === undefined) {
    throw new Error("addHook: fiber is undefined");
  }
  fiber.hooks.push(hook);
  fiber.currentHookIndex = fiber.hooks.length - 1;
  return hook;
}

function useState<T>(initialValue: T): [T, (newValue: T) => void] {
  let hook = getNextHook();
  if (hook === null) {
    console.log(`useRef: next hook is null at instance ${currentInstance}, creating new one with initial value: `, initialValue);
    hook = addHook(new Hook('state', initialValue));
  }
  if (hook === null) {
    throw new Error("useRef: hook is null");
  }
  if (hook.type !== 'state') {
    throw new Error("useRef: hook is not a state hook");
  }
  return [hook.value, (newValue) => {hook.value = newValue;}];
}

async function renderComponent(component: () => string, instance: string): Promise<string|null> {

  const lock = await lockManager.getLock(instance);
  if (!lock) {
    console.error("renderComponent: lock not acquired");
    return null;
  }
  let fiber = fibersByInstance.get(instance);
  if (fiber === undefined) {
    fiber = {
      instance: instance,
      currentHookIndex: -1,
      hooks: []
    }
    fibersByInstance.set(instance, fiber);
  }

  currentInstance = instance;
  const result = component();
  currentInstance = null;
  fiber.currentHookIndex = -1;

  lockManager.releaseLock(instance)


  return result;

}

function SomeComponent(): string {
  const someNames = ['Alice', 'Bob', 'Charlie'];
  const [count, setCount] = useState(0);
  const [name, setName] = useState('Alice');
  setCount(count + 1);
  setName(someNames[Math.floor(Math.random() * someNames.length)]);
  return `The count is ${count}, and the name is ${name}.`;
}



// let's do it!

[ 'ALPHA', 'BETA'].forEach( async (instance) => {
  for (let i = 0; i < 10; i++) {

    if (Math.random() < 0.5) {
      const result = await renderComponent(SomeComponent, instance);
      console.log(`Instance ${instance}, iteration ${i}: '${result}'`);
    } else {
      console.log(`Instance ${instance}, iteration ${i}: not rendered`);
    }
  }
})

