/* eslint-disable no-underscore-dangle */
import { findDOMNode } from 'react-dom';
import get from 'lodash/get';
import clutchBridge, {
  classnames,
  getUniqueClassName,
} from '@clutch-creator/bridge';
import shallowEqual from './helpers/shallow-equal';

export * from './hooks';

export default function withClutch(WrappedComponent) {
  class ClutchComponent extends WrappedComponent {
    constructor(props, context) {
      super(props, context);

      // Set flowProps references
      const { flowProps } = this.props.clutchProps || {};
      this.flowProps = flowProps || {};
    }

    shouldComponentUpdate(nextProps, nextState) {
      // XXX ignore user component should component update?
      const { clutchProps = {}, ...ownProps } = this.props;
      const { clutchProps: newClutchProps = {}, ...newOwnProps } = nextProps;

      // Update flowProps references
      const { flowProps } = newClutchProps || {};
      this.flowProps = flowProps || {};

      return (
        !shallowEqual(ownProps, newOwnProps) ||
        !shallowEqual(nextState, this.state) ||
        !shallowEqual(clutchProps.flowProps, newClutchProps.flowProps)
      );
    }

    componentDidUpdate(prevProps, prevState, snapshot) {
      if (super.componentDidUpdate) {
        super.componentDidUpdate(prevProps, prevState, snapshot);
      }

      const { clutchProps } = this.props;
      const clutchSelection = this.getClutchSelection();

      // update component master props values on bridge component
      clutchBridge.updateComponentMasterProps(
        clutchSelection,
        this.masterProps,
      );

      // update component inbound props on ide
      clutchBridge.updateComponentInboundProps(
        clutchSelection,
        clutchProps && clutchProps.flowProps,
      );
    }

    componentWillUnmount() {
      if (super.componentWillUnmount) {
        super.componentWillUnmount();
      }

      clutchBridge.unregisterComponent(this.getClutchSelection());
    }

    getClutchSelection(props = this.props) {
      const { clutchProps } = props;

      return (
        (clutchProps && clutchProps.selection) ||
        get(this.masterProps, ['clutchProps', 'defaultSelection']) ||
        (clutchProps && clutchProps.defaultSelection)
      );
    }

    clutchUpdateRef = (ref) => {
      const node = !ref || ref.tagName ? ref : findDOMNode(ref);

      if (this.node !== node) {
        this.node = node;

        // register element ref
        clutchBridge.registerComponentReference(
          this.getClutchSelection(),
          this.node,
        );
      }
    };

    useClutch(privateProps, props) {
      if (typeof privateProps !== 'function') {
        // eslint-disable-next-line no-console
        console.error('First argument of useClutch must be a function.');
        return props;
      }

      let resultProps = privateProps(props);
      const propsTypes = get(resultProps, ['clutchProps', 'propsTypes'], {});

      // convert children to render clutch children calls
      resultProps = Object.entries(propsTypes).reduce(
        (acc, [key, propType]) => {
          if (propType === 'Children') {
            return {
              ...acc,
              [key]: this.renderClutchChildren.bind(
                this,
                key,
                resultProps[key],
              ),
            };
          }

          if (propType === 'Styles' && process.env.NODE_ENV !== 'production') {
            const val = resultProps[key];

            const identifier = getUniqueClassName(
              this.getClutchSelection(resultProps),
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
        },
        resultProps,
      );

      // bind functions to this instance context
      resultProps = Object.entries(resultProps).reduce((acc, [key, val]) => {
        if (
          typeof val === 'function' &&
          (!val.prototype || !val.prototype.isReactComponent)
        ) {
          return {
            ...acc,
            [key]: val.bind(this),
          };
        }

        return acc;
      }, resultProps);

      this.masterProps = Object.assign({}, resultProps);

      // set ref
      resultProps.ref = this.clutchUpdateRef;

      if (!this.clutchRegistered) {
        this.clutchRegistered = true;

        // initiate listener for component changes and children changes
        clutchBridge.registerComponent(
          this.getClutchSelection(),
          get(this.props, ['clutchProps', 'parentSelection']),
          get(this.props, ['clutchProps', 'masterProps']),
        );

        // update component inbound props on ide
        clutchBridge.updateComponentInboundProps(
          this.getClutchSelection(),
          this.flowProps,
        );
      }

      return resultProps;
    }

    render() {
      return super.render();
    }

    renderClutchChildren(propName, value, flowProps, key) {
      const selection = this.getClutchSelection();
      const clutchProps = this.props.clutchProps || {};
      let result = value;

      let childrenFlowProps = clutchProps.flowProps || {};

      if (flowProps) {
        childrenFlowProps = Object.assign({}, childrenFlowProps, flowProps);
        clutchBridge.updateComponentOutboundProps(
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

  return ClutchComponent;
}
