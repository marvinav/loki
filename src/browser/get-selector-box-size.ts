type BoundingBox = {
  x: number;
  y: number;
  width: number;
  height: number;
};

const getSelectorBoxSize = (
  window: Window & typeof globalThis,
  selector: string
): BoundingBox => {
  function hasOverflow(element: Element) {
    const overflowValues = ['auto', 'hidden', 'scroll'];
    const style = window.getComputedStyle(element);

    if (
      overflowValues.includes(style.overflowY) ||
      overflowValues.includes(style.overflowX) ||
      overflowValues.includes(style.overflow)
    ) {
      return true;
    }

    return false;
  }

  function hasFixedPosition(element: Element) {
    const style = window.getComputedStyle(element);
    return style.position === 'fixed';
  }

  function isElementHiddenByOverflow(
    element: Element,
    {
      hasParentFixedPosition,
      hasParentOverflowHidden,
      parentNotVisible,
    }: {
      hasParentFixedPosition: Element | null;
      hasParentOverflowHidden: Element | null;
      parentNotVisible: boolean;
    }
  ) {
    const isElementOutOfBounds = () => {
      if (!hasParentOverflowHidden) {
        return false;
      }

      try {
        const elementRect = element.getBoundingClientRect();
        const containerRect = hasParentOverflowHidden.getBoundingClientRect();
        const top = elementRect.top < containerRect.top;
        const bottom = elementRect.bottom > containerRect.bottom;
        const left = elementRect.left < containerRect.left;
        const right = elementRect.right > containerRect.right;
        return top || bottom || left || right;
      } catch (e) {
        return false;
      }
    };

    // Has fixed so it should always be visible
    if (hasFixedPosition(element)) {
      return false;
    }

    // Element is not fixed and parent is hidden by overflow
    // So this should not be visible
    if (parentNotVisible) {
      return true;
    }

    // Parent has fixed and overflow hidden
    // check if its out of bounds
    if (
      hasParentFixedPosition &&
      hasParentOverflowHidden &&
      hasParentFixedPosition === hasParentOverflowHidden
    ) {
      return isElementOutOfBounds();
    }

    // If we have a fixed element deeper then overflow
    // We know the element is visible
    if (
      hasParentFixedPosition &&
      hasParentOverflowHidden &&
      hasParentOverflowHidden !== hasParentFixedPosition &&
      hasParentOverflowHidden.contains(hasParentFixedPosition)
    ) {
      return false;
    }

    // Parent has overflow so we need to check if this element is out of bounds
    if (hasParentOverflowHidden) {
      return isElementOutOfBounds();
    }

    return false;
  }

  function isVisible(element: Element) {
    const style = window.getComputedStyle(element);
    return !(
      style.visibility === 'hidden' ||
      style.display === 'none' ||
      style.opacity === '0' ||
      ((style.width === '0px' || style.height === '0px') &&
        style.padding === '0px')
    );
  }

  const elements: Element[] = [];

  function walk(
    element: Element | null,
    {
      isRoot = false,
      hasParentOverflowHidden = null,
      hasParentFixedPosition = null,
      parentNotVisible = false,
      root,
    }: {
      isRoot?: boolean;
      hasParentOverflowHidden?: Element | null;
      hasParentFixedPosition?: Element | null;
      parentNotVisible?: boolean;
      root: Element;
    }
  ) {
    if (!element) {
      return;
    }

    const ignoreIsElementHiddenByOverflow =
      element.parentElement === root && hasOverflow(root);
    const elementHiddenByOverflow = ignoreIsElementHiddenByOverflow
      ? false
      : isElementHiddenByOverflow(element, {
          hasParentFixedPosition: hasParentFixedPosition ?? null,
          hasParentOverflowHidden: hasParentOverflowHidden ?? null,
          parentNotVisible: parentNotVisible ?? false,
        });

    if (isVisible(element) && !isRoot && !elementHiddenByOverflow) {
      elements.push(element);
    }

    for (
      let node: ChildNode | null = element.firstChild;
      node;
      node = node.nextSibling
    ) {
      if (node.nodeType === 1) {
        walk(node as Element, {
          root,
          isRoot: false,
          parentNotVisible: elementHiddenByOverflow,
          hasParentFixedPosition: hasFixedPosition(element)
            ? element
            : hasParentFixedPosition ?? null,
          hasParentOverflowHidden: hasOverflow(element)
            ? element
            : hasParentOverflowHidden ?? null,
        });
      }
    }
  }

  function getRootElement(rootSelector: string): Element | null {
    const roots = Array.from(
      window.document.querySelectorAll<HTMLElement>(rootSelector)
    )
      .map((element) => element.parentElement)
      .filter((parent): parent is HTMLElement => Boolean(parent));

    if (roots.length === 1) {
      return roots[0] ?? null;
    }

    // Find the deepest node
    return roots.reduce<HTMLElement | null>((root, node) => {
      if (!root) {
        return node;
      }

      if (root.contains(node) && root !== node) {
        return node;
      }

      return root;
    }, null);
  }

  const root = getRootElement(selector);

  if (!root) {
    throw new Error('No visible elements found');
  }

  walk(root, { isRoot: true, root });

  if (elements.length === 0) {
    throw new Error('No visible elements found');
  }

  const getBoundingClientRect = (element: Element): BoundingBox => {
    const { x, y, width, height } = element.getBoundingClientRect();
    return { x, y, width, height };
  };

  const boxSizeUnion = (
    domRect: BoundingBox,
    { x, y, width, height }: BoundingBox
  ): BoundingBox => {
    if (!domRect) {
      return { x, y, width, height };
    }

    const xMin = Math.min(domRect.x, x);
    const yMin = Math.min(domRect.y, y);

    const xMax = Math.max(domRect.x + domRect.width, x + width);
    const yMax = Math.max(domRect.y + domRect.height, y + height);

    return {
      x: xMin,
      y: yMin,
      width: xMax - xMin,
      height: yMax - yMin,
    };
  };

  const [first, ...rest] = elements.map(getBoundingClientRect);
  if (!first) {
    throw new Error('No visible elements found');
  }

  return rest.reduce(boxSizeUnion, first);
};

export default getSelectorBoxSize;
