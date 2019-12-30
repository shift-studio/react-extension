/* eslint-disable no-underscore-dangle */
import { useState, useCallback, useEffect, useRef, useReducer } from 'react';
import get from 'lodash/get';
import shiftBridge, {
  classnames,
  getUniqueClassName,
} from '@shift-studio/bridge';

const getShiftSelection = ({ shiftProps }) =>
  (shiftProps && shiftProps.selection) || {};

const getShiftParentSelection = ({ shiftProps }) =>
  (shiftProps && shiftProps.parentSelection) || {};

const updateComponentState = (newState, key, selection) => {
  const ideState = shiftBridge.getComponentState(selection) || {};
  const updatedIdeState = { ...ideState, [key]: newState };

  shiftBridge.updateComponentState(selection, updatedIdeState);
};

function useShiftReducer(props, key, reducer, initialState) {
  if (key === undefined) {
    throw new Error('No key provided for useShiftReducer');
  }
  const [state, dispatch] = useReducer(reducer, initialState);

  useEffect(
    () => {
      const selection = getShiftSelection(props);

      // Set the IDE's state
      updateComponentState(state, key, selection);
    },
    [state],
  );

  return [state, dispatch];
}

function useShiftState(props, key, initialState) {
  if (key === undefined) {
    throw new Error('No key provided for useShiftState');
  }
  const [state, setState] = useState(initialState);

  useEffect(
    () => {
      const selection = getShiftSelection(props);

      // Set the IDE's state
      updateComponentState(state, key, selection);
    },
    [state],
  );

  return [state, setState];
}

function useShiftRef(props, initialValue) {
  const selection = getShiftSelection(props);
  const ref = useRef(initialValue);

  useEffect(
    () => {
      if (ref) {
        shiftBridge.registerComponentReference(selection, ref.current);
      }
    },
    [ref],
  );

  return ref;
}

const renderShiftChildren = (shiftProps, propName, value, flowProps, key) => {
  const selection = shiftProps.selection;
  let result = value;
  let childrenFlowProps = shiftProps.flowProps || {};

  if (flowProps) {
    childrenFlowProps = Object.assign({}, childrenFlowProps, flowProps);
    shiftBridge.updateComponentOutboundProps(selection, propName, flowProps);
  }

  if (typeof value === 'function') {
    result = value(childrenFlowProps, key, selection);
  } else if (value === undefined) {
    result = null;
  }

  return result;
};

function getMergedProperties(privateProps, props) {
  const resultProps = privateProps(props);
  const propsTypes = get(resultProps, ['shiftProps', 'propsTypes'], {});
  const shiftProps = (resultProps && resultProps.shiftProps) || {};
  const { masterProps, flowProps } = shiftProps;

  // convert children to render shift children calls
  Object.entries(propsTypes).reduce((acc, [key, propType]) => {
    if (propType === 'Children') {
      return {
        ...acc,
        [key]: renderShiftChildren.bind(
          this,
          shiftProps,
          key,
          resultProps[key],
        ),
      };
    }

    return acc;
  }, resultProps);

  // bind functions to this instance context
  Object.entries(resultProps).reduce((acc, [key, val]) => {
    if (typeof val === 'function') {
      return {
        ...acc,
        [key]: val.bind({ masterProps, flowProps }),
      };
    }

    if (
      process.env.NODE_ENV !== 'production' &&
      val &&
      val.className &&
      val.style
    ) {
      // lets add get unique class name for rules identification

      return {
        ...acc,
        [key]: Object.assign({}, val, {
          className: classnames(
            val.className,
            getUniqueClassName(this.getShiftSelection(resultProps)),
          ),
        }),
      };
    }

    return acc;
  }, resultProps);

  return resultProps;
}

/**
 * useShiftHooks - Returns react hooks proxy connected to shift ide
 *
 * @param {Function} privateProps - private properties function
 * @param {Object} props - react props
 *
 * @returns {Object} object with hooks
 */
export function useShiftHooks(privateProps, props) {
  const result = getMergedProperties(privateProps, props);

  return {
    useRef: useShiftRef.bind(undefined, result),
    useState: useShiftState.bind(undefined, result),
    useReducer: useShiftReducer.bind(undefined, result),
  };
}

/**
 * useShift - Hook to connect to shift and calculate merged properties
 *
 * @param {Function} privateProps - private properties function
 * @param {Object} props - react props
 *
 * @returns {Object} resulting merged props
 */
export function useShift(privateProps, props) {
  const result = getMergedProperties(privateProps, props);
  const selection = getShiftSelection(result);
  const parentSelection = getShiftParentSelection(result);

  // Force update
  const [, forceState] = useState();
  const forceUpdate = useCallback(() => forceState({}), []);
  const { shiftProps } = selection;

  useEffect(() => {
    // initiate listener for component changes and children changes
    shiftBridge.registerComponent(
      selection,
      parentSelection,
      forceUpdate,
      forceState,
    );

    // update component inbound props on ide
    shiftBridge.updateComponentInboundProps(
      selection,
      shiftProps && shiftProps.flowProps,
    );

    return () => {
      shiftBridge.unregisterComponent(selection);
    };
  }, []);

  return result;
}
