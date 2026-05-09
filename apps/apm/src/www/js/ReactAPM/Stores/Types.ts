


/**
 * A function that sets a property of a store's state.
 *
 * The setter can take either the new value for the prop or a function that takes the current state and returns the new value.
 */
export type StatePropSetter<PropType> = ((state: (PropType| ((current:PropType) => PropType))) => void);