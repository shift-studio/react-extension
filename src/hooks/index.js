/* eslint-disable no-underscore-dangle */
import { useEffect, useRef } from 'react';
import get from 'lodash/get';
import clutchBridge, {
  classnames,
  getUniqueClassName,
} from '@clutch-creator/bridge';

const getClutchSelection = ({ clutchProps }) =>
  (clutchProps && clutchProps.selection) || {};

const getClutchParentSelection = ({ clutchProps }) =>
  (clutchProps && clutchProps.parentSelection) || {};

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
  if (typeof privateProps !== 'function') {
    // eslint-disable-next-line no-console
    console.error('First argument of useClutch must be a function.');
    return props;
  }

  let resultProps = privateProps(props);
  const propsTypes = get(resultProps, ['clutchProps', 'propsTypes'], {});
  const clutchProps = (resultProps && resultProps.clutchProps) || {};
  const { masterProps, flowProps } = clutchProps;

  // convert children to render clutch children calls
  resultProps = Object.entries(propsTypes).reduce((acc, [key, propType]) => {
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

      const identifier = getUniqueClassName(
        getClutchSelection(resultProps),
        key,
      );

      return {
        ...acc,
        [key]: {
          className: classnames(val && val.className, identifier),
          style: (val && val.style) || {},
        },
      };
    }

    return acc;
  }, resultProps);

  // bind functions to this instance context
  resultProps = Object.entries(resultProps).reduce((acc, [key, val]) => {
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
 * useClutch - Hook to connect to clutch and calculate merged properties
 *
 * @param {Function} privateProps - private properties function
 * @param {Object} props - react props
 *
 * @returns {Object} resulting merged props
 */
// eslint-disable-next-line import/prefer-default-export
export function useClutch(privateProps, props) {
  const result = getMergedProperties(privateProps, props);
  const selection = getClutchSelection(result);
  const parentSelection = getClutchParentSelection(result);
  const masterProps = get(props, ['clutchProps', 'masterProps']);
  const { clutchProps } = selection;

  // Ref
  const ref = useRef(null);

  useEffect(() => {
    if (ref) {
      clutchBridge.registerComponentReference(selection, ref.current);
    }
  }, [ref]);

  result.ref = ref;

  useEffect(() => {
    // initiate listener for component changes and children changes
    clutchBridge.registerComponent(selection, parentSelection, masterProps);

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
