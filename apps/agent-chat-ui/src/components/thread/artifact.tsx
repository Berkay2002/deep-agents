import {
  createContext,
  type HTMLAttributes,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";

const ArtifactSlotContext = createContext<{
  open: [
    string | null,
    (value: string | null | ((value: string | null) => string | null)) => void,
  ];
  mounted: [
    string | null,
    (value: string | null | ((value: string | null) => string | null)) => void,
  ];

  title: [
    HTMLElement | null,
    (
      value:
        | HTMLElement
        | null
        | ((value: HTMLElement | null) => HTMLElement | null)
    ) => void,
  ];
  content: [
    HTMLElement | null,
    (
      value:
        | HTMLElement
        | null
        | ((value: HTMLElement | null) => HTMLElement | null)
    ) => void,
  ];

  context: [
    Record<string, unknown>,
    (
      value:
        | Record<string, unknown>
        | ((value: Record<string, unknown>) => Record<string, unknown>)
    ) => void,
  ];
} | null>(null);

/**
 * Headless component that will obtain the title and content of the artifact
 * and render them in place of the `ArtifactContent` and `ArtifactTitle` components via
 * React Portals.
 */
const ArtifactSlot = (props: {
  id: string;
  children?: ReactNode;
  title?: ReactNode;
}) => {
  const context = useContext(ArtifactSlotContext);
  const noOpFunction = () => {
    // No-op function for when context is not available
  };
  const [ctxMounted, ctxSetMounted] = context?.mounted ?? [null, noOpFunction];
  const [content] = context?.content ?? [null];
  const [title] = context?.title ?? [null];

  const isMounted = ctxMounted === props.id;
  const isEmpty = props.children == null && props.title == null;

  useEffect(() => {
    if (isEmpty && context) {
      ctxSetMounted((open) => (open === props.id ? null : open));
    }
  }, [isEmpty, ctxSetMounted, props.id, context]);

  if (!isMounted) {
    return null;
  }

  if (!context) {
    return null;
  }

  return (
    <>
      {title != null ? createPortal(props.title, title) : null}
      {content != null ? createPortal(props.children, content) : null}
    </>
  );
};

export function ArtifactContent(props: HTMLAttributes<HTMLDivElement>) {
  const context = useContext(ArtifactSlotContext);
  const [mounted] = context?.mounted ?? [null];
  const ref = useRef<HTMLDivElement>(null);
  const noOpSetter = () => {
    // No-op function for when context is not available
  };
  const [, setStateRef] = context?.content ?? [null, noOpSetter];

  useLayoutEffect(
    () => setStateRef?.(mounted ? ref.current : null),
    [setStateRef, mounted]
  );

  if (!mounted) {
    return null;
  }

  if (!context) {
    return null;
  }

  return <div {...props} ref={ref} />;
}
export function ArtifactTitle(props: HTMLAttributes<HTMLDivElement>) {
  const context = useContext(ArtifactSlotContext);
  const ref = useRef<HTMLDivElement>(null);
  const noOpSetter = () => {
    // No-op function for when context is not available
  };
  const [, setStateRef] = context?.title ?? [null, noOpSetter];

  useLayoutEffect(() => setStateRef?.(ref.current), [setStateRef]);

  if (!context) {
    return null;
  }

  return <div {...props} ref={ref} />;
}

export function ArtifactProvider(props: { children?: ReactNode }) {
  const content = useState<HTMLElement | null>(null);
  const title = useState<HTMLElement | null>(null);

  const open = useState<string | null>(null);
  const mounted = useState<string | null>(null);
  const context = useState<Record<string, unknown>>({});

  return (
    <ArtifactSlotContext.Provider
      value={{ open, mounted, title, content, context }}
    >
      {props.children}
    </ArtifactSlotContext.Provider>
  );
}

/**
 * Provides a value to be passed into `meta.artifact` field
 * of the `LoadExternalComponent` component, to be consumed by the `useArtifact` hook
 * on the generative UI side.
 */
export function useArtifact() {
  const id = useId();
  const context = useContext(ArtifactSlotContext);

  if (!context) {
    throw new Error("useArtifact must be used within an ArtifactProvider");
  }

  const [ctxOpen, ctxSetOpen] = context.open;
  const [ctxContext, ctxSetContext] = context.context;
  const [, ctxSetMounted] = context.mounted;

  const isOpen = ctxOpen === id;
  const setArtifactOpenState = useCallback(
    (newValue: boolean | ((value: boolean) => boolean)) => {
      if (typeof newValue === "boolean") {
        ctxSetOpen(newValue ? id : null);
      } else {
        ctxSetOpen((currentOpen) => (currentOpen === id ? null : id));
      }

      ctxSetMounted(id);
    },
    [ctxSetOpen, ctxSetMounted, id]
  );

  const ArtifactContentComponent = useCallback(
    (slotProps: { title?: React.ReactNode; children: React.ReactNode }) => (
      <ArtifactSlot id={id} title={slotProps.title}>
        {slotProps.children}
      </ArtifactSlot>
    ),
    [id]
  );

  return [
    ArtifactContentComponent,
    {
      open: isOpen,
      setOpen: setArtifactOpenState,
      context: ctxContext,
      setContext: ctxSetContext,
    },
  ] as [
    typeof ArtifactContentComponent,
    {
      open: typeof isOpen;
      setOpen: typeof setArtifactOpenState;
      context: typeof ctxContext;
      setContext: typeof ctxSetContext;
    },
  ];
}

/**
 * General hook for detecting if any artifact is open.
 */
export function useArtifactOpen() {
  const context = useContext(ArtifactSlotContext);
  const noOpCallback = () => {
    // No-op function when context is not available
  };

  const [ctxOpen, setCtxOpen] = context?.open ?? [null, noOpCallback];

  const open = ctxOpen !== null;
  const onClose = useCallback(() => setCtxOpen(null), [setCtxOpen]);

  return [open, onClose] as const;
}

/**
 * Artifacts may at their discretion provide additional context
 * that will be used when creating a new run.
 */
export function useArtifactContext() {
  const context = useContext(ArtifactSlotContext);
  return context?.context || {};
}
