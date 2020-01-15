/* eslint-disable no-underscore-dangle */
import { useState, useCallback, useEffect, useRef, useReducer } from 'react';
import get from 'lodash/get';
import clutchBridge, {
  classnames,
  getUniqueClassName,
} from '@clutch-creator/bridge';

const getClutchSelection = ({ clutchProps }) =>
  (clutchProps && clutchProps.selection) || {};

const getClutchParentSelection = ({ clutchProps }) =>
  (clutchProps && clutchProps.parentSelection) || {};

const updateComponentState = (newState, key, selection) => {
  const ideState = clutchBridge.getComponentState(selection) || {};
  const updatedIdeState = { ...ideState, [key]: newState };

  clutchBridge.updateComponentState(selection, updatedIdeState);
};

function useClutchReducer(props, key, reducer, initialState) {
  if (key === undefined) {
    throw new Error('No key provided for useClutchReducer');
  }
  const [state, dispatch] = useReducer(reducer, initialState);

  useEffect(() => {
    const selection = getClutchSelection(props);

    // Set the IDE's state
    updateComponentState(state, key, selection);
  }, [state]);

  return [state, dispatch];
}

function useClutchState(props, key, initialState) {
  if (key === undefined) {
    throw new Error('No key provided for useClutchState');
  }
  const [state, setState] = useState(initialState);

  useEffect(() => {
    const selection = getClutchSelection(props);

    // Set the IDE's state
    updateComponentState(state, key, selection);
  }, [state]);

  return [state, setState];
}

function useClutchRef(props, initialValue) {
  const selection = getClutchSelection(props);
  const ref = useRef(initialValue);

  useEffect(() => {
    if (ref) {
      clutchBridge.registerComponentReference(selection, ref.current);
    }
  }, [ref]);

  return ref;
}

const renderClutchChildren = (clutchProps, propName, value, flowProps, key) => {
  const selection = clutchProps.selection;
  let result = value;
  let childrenFlowProps = clutchProps.flowProps || {};

  if (flowProps) {
    childrenFlowProps = Object.assign({}, childrenFlowProps, flowProps);
    clutchBridge.updateComponentOutboundProps(selection, propName, flowProps);
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
  const propsTypes = get(resultProps, ['clutchProps', 'propsTypes'], {});
  const clutchProps = (resultProps && resultProps.clutchProps) || {};
  const { masterProps, flowProps } = clutchProps;

  // convert children to render clutch children calls
  Object.entries(propsTypes).reduce((acc, [key, propType]) => {
    if (propType === 'Children') {
      return {
        ...acc,
        [key]: renderClutchChildren.bind(
          this,
          clutchProps,
          key,
          resultProps[key],
        ),
      };
    }

    if (propType === 'Styles' && process.env.NODE_ENV !== 'production') {
      const val = resultProps[key];

      return {
        ...acc,
        [key]: {
          className: classnames(
            val && val.className,
            getUniqueClassName(this.getClutchSelection(resultProps), key),
          ),
        },
      };
    }

    return acc;
  }, resultProps);

  // bind functions to this instance context
  Object.entries(resultProps).reduce((acc, [key, val]) => {
    if (
      typeof val === 'function' &&
      (!val.prototype || !val.prototype.isReactComponent)
    ) {
      return {
        ...acc,
        [key]: val.bind({ masterProps, flowProps }),
      };
    }

    return acc;
  }, resultProps);

  return resultProps;
}

/**
 * useClutchHooks - Returns react hooks proxy connected to clutch ide
 *
 * @param {Function} privateProps - private properties function
 * @param {Object} props - react props
 *
 * @returns {Object} object with hooks
 */
export function useClutchHooks(privateProps, props) {
  const result = getMergedProperties(privateProps, props);

  return {
    useRef: useClutchRef.bind(undefined, result),
    useState: useClutchState.bind(undefined, result),
    useReducer: useClutchReducer.bind(undefined, result),
  };
}

/**
 * useClutch - Hook to connect to clutch and calculate merged properties
 *
 * @param {Function} privateProps - private properties function
 * @param {Object} props - react props
 *
 * @returns {Object} resulting merged props
 */
export function useClutch(privateProps, props) {
  const result = getMergedProperties(privateProps, props);
  const selection = getClutchSelection(result);
  const parentSelection = getClutchParentSelection(result);

  // Force update
  const [, forceState] = useState();
  const forceUpdate = useCallback(() => forceState({}), []);
  const { clutchProps } = selection;

  useEffect(() => {
    // initiate listener for component changes and children changes
    clutchBridge.registerComponent(
      selection,
      parentSelection,
      forceUpdate,
      forceState,
    );

    // update component inbound props on ide
    clutchBridge.updateComponentInboundProps(
      selection,
      clutchProps && clutchProps.flowProps,
    );

    return () => {
      clutchBridge.unregisterComponent(selection);
    };
  }, []);

  return result;
}
