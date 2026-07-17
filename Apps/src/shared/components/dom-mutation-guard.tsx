"use client";

import { useEffect } from "react";

/**
 * Guards against `NotFoundError: Failed to execute 'removeChild' / 'insertBefore'
 * on 'Node'` crashes caused by third-party DOM mutations (browser extensions,
 * Google Translate) racing React's reconciliation. See vercel/next.js#58055.
 *
 * It only neutralizes operations that are already invalid (the target node is
 * not actually a child), so valid React updates are untouched.
 */
export function DomMutationGuard() {
  useEffect(() => {
    const flag = window as unknown as { __domMutationGuard?: boolean };
    if (flag.__domMutationGuard) return;
    flag.__domMutationGuard = true;

    const originalRemoveChild = Node.prototype.removeChild;
    Node.prototype.removeChild = function removeChild<T extends Node>(child: T): T {
      if (child.parentNode !== this) return child;
      return originalRemoveChild.call(this, child) as T;
    };

    const originalInsertBefore = Node.prototype.insertBefore;
    Node.prototype.insertBefore = function insertBefore<T extends Node>(
      node: T,
      reference: Node | null,
    ): T {
      if (reference && reference.parentNode !== this) return this.appendChild(node) as T;
      return originalInsertBefore.call(this, node, reference) as T;
    };
  }, []);

  return null;
}
