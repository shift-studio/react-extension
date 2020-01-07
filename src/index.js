/* eslint-disable no-underscore-dangle */
import { findDOMNode } from 'react-dom';
import shiftBridge, {
  classnames,
  getUniqueClassName,
} from '@shift-studio/bridge';
import get from 'lodash/get';
import shallowEqual from './helpers/shallow-equal';
import { useShift, useShiftHooks } from './hooks';

export { useShift, useShiftHooks };

export default function shiftExtensionReact(WrappedComponent) {
  class ShiftComponent extends WrappedComponent {
    constructor(props, context) {
      super(props, context);

      // default state
      this.state = Object.assign({}, this.state);

      // Set flowProps references
      const { flowProps } = this.props.shiftProps || {};
      this.flowProps = flowProps || {};
    }

    shouldComponentUpdate(nextProps, nextState) {
      // XXX ignore user component should component update?
      const { shiftProps = {}, ...ownProps } = this.props;
      const { shiftProps: newShiftProps = {}, ...newOwnProps } = nextProps;

      // Update flowProps references
      const { flowProps } = newShiftProps || {};
      this.flowProps = flowProps || {};

      return (
        !shallowEqual(ownProps, newOwnProps) ||
        !shallowEqual(nextState, this.state) ||
        !shallowEqual(shiftProps.flowProps, newShiftProps.flowProps)
      );
    }

    componentDidUpdate(prevProps, prevState, snapshot) {
      if (super.componentDidUpdate) {
        super.componentDidUpdate(prevProps, prevState, snapshot);
      }

      const { shiftProps } = this.props;

      // update component inbound props on ide
      shiftBridge.updateComponentInboundProps(
        this.getShiftSelection(),
        shiftProps && shiftProps.flowProps,
      );

      // update component state on ide
      if (!shallowEqual(prevState, this.state)) {
        shiftBridge.updateComponentState(this.getShiftSelection(), this.state);
      }
    }

    componentWillUnmount() {
      if (super.componentWillUnmount) {
        super.componentWillUnmount();
      }

      shiftBridge.unregisterComponent(this.getShiftSelection());
    }

    getShiftSelection(props = this.props) {
      const { shiftProps } = props;

      return (
        (shiftProps && shiftProps.selection) ||
        get(this.masterProps, ['shiftProps', 'defaultSelection']) ||
        (shiftProps && shiftProps.defaultSelection)
      );
    }

    shiftRefUpdated = (ref) => {
      const node = !ref || ref.tagName ? ref : findDOMNode(ref);

      if (this.node !== node) {
        this.node = node;

        // register element ref
        shiftBridge.registerComponentReference(
          this.getShiftSelection(),
          this.node,
        );
      }
    };

    useShift(privateProps, props) {
      if (typeof privateProps !== 'function') {
        // eslint-disable-next-line no-console
        console.error('First argument of useShift must be a function.');
        return props;
      }

      let resultProps = privateProps(props);
      const propsTypes = get(resultProps, ['shiftProps', 'propsTypes'], {});

      // convert children to render shift children calls
      resultProps = Object.entries(propsTypes).reduce(
        (acc, [key, propType]) => {
          if (propType === 'Children') {
            return {
              ...acc,
              [key]: this.renderShiftChildren.bind(this, key, resultProps[key]),
            };
          }

          return acc;
        },
        resultProps,
      );

      // bind functions to this instance context
      resultProps = Object.entries(resultProps).reduce((acc, [key, val]) => {
        if (typeof val === 'function') {
          return {
            ...acc,
            [key]: val.bind(this),
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
                getUniqueClassName(this.getShiftSelection(resultProps), key),
              ),
            }),
          };
        }

        return acc;
      }, resultProps);

      this.masterProps = Object.assign({}, resultProps);

      if (!this.shiftRegistered) {
        this.shiftRegistered = true;

        // initiate listener for component changes and children changes
        shiftBridge.registerComponent(
          this.getShiftSelection(),
          get(this.props, ['shiftProps', 'parentSelection']),
          get(this.props, ['shiftProps', 'masterProps']),
          this.forceUpdate.bind(this),
          this.setState.bind(this),
        );

        // update component inbound props on ide
        shiftBridge.updateComponentInboundProps(
          this.getShiftSelection(),
          this.flowProps,
        );

        // update component state on ide
        if (this.state) {
          shiftBridge.updateComponentState(
            this.getShiftSelection(),
            this.state,
          );
        }
      }

      return resultProps;
    }

    render() {
      return super.render();
    }

    renderShiftChildren(propName, value, flowProps, key) {
      const selection = this.getShiftSelection();
      const shiftProps = this.props.shiftProps || {};
      let result = value;

      let childrenFlowProps = shiftProps.flowProps || {};

      if (flowProps) {
        childrenFlowProps = Object.assign({}, childrenFlowProps, flowProps);
        shiftBridge.updateComponentOutboundProps(
          selection,
          propName,
          flowProps,
        );
      }

      if (typeof value === 'function') {
        result = value(childrenFlowProps, key, selection);
      } else if (value === undefined) {
        result = null;
      }

      return result;
    }
  }

  return ShiftComponent;
}
