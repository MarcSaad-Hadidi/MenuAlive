import Link from "next/link";
import type {
  AnchorHTMLAttributes,
  ButtonHTMLAttributes,
  ComponentProps,
  MouseEvent,
  ReactNode
} from "react";
import { LiquidGlassShell } from "@/components/LiquidGlassShell";
import {
  liquidGlassButtonClasses,
  type LiquidGlassButtonSize,
  type LiquidGlassButtonVariant
} from "@/lib/liquidGlassButton";

type SharedProps = {
  children: ReactNode;
  className?: string;
  variant?: LiquidGlassButtonVariant;
  size?: LiquidGlassButtonSize;
  disabled?: boolean;
};

type GlassButtonAsButton = SharedProps &
  ButtonHTMLAttributes<HTMLButtonElement> & {
    as?: "button";
  };

type GlassButtonAsAnchor = SharedProps &
  AnchorHTMLAttributes<HTMLAnchorElement> & {
    as: "a";
    disabled?: boolean;
  };

type GlassButtonAsLink = SharedProps &
  Omit<ComponentProps<typeof Link>, "className"> & {
    as: "link";
    disabled?: boolean;
  };

export type GlassButtonProps =
  | GlassButtonAsButton
  | GlassButtonAsAnchor
  | GlassButtonAsLink;

function disabledAnchorProps(disabled?: boolean) {
  if (!disabled) {
    return {};
  }

  return {
    "aria-disabled": true as const,
    tabIndex: -1,
    onClick: (event: MouseEvent) => {
      event.preventDefault();
    }
  };
}

function stripLinkShell(props: GlassButtonAsLink) {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { as, disabled, children, className, variant, size, ...rest } = props;
  return rest;
}

function stripAnchorShell(props: GlassButtonAsAnchor) {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { as, disabled, children, className, variant, size, ...rest } = props;
  return rest;
}

function stripButtonShell(props: GlassButtonAsButton) {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { as, disabled, children, className, variant, size, ...rest } = props;
  return rest;
}

export function GlassButton(props: GlassButtonProps) {
  const {
    children,
    className = "",
    variant = "primary",
    size = "default"
  } = props;

  const classes = liquidGlassButtonClasses({ variant, size, className });

  if (props.as === "link") {
    if (props.disabled) {
      return (
        <span
          className={`${classes} liquid-glass-button-disabled`}
          aria-disabled="true"
        >
          <LiquidGlassShell>{children}</LiquidGlassShell>
        </span>
      );
    }

    return (
      <Link className={classes} {...stripLinkShell(props)}>
        <LiquidGlassShell>{children}</LiquidGlassShell>
      </Link>
    );
  }

  if (props.as === "a") {
    const isDisabled = props.disabled;

    return (
      <a
        className={`${classes}${isDisabled ? " liquid-glass-button-disabled" : ""}`}
        {...stripAnchorShell(props)}
        {...disabledAnchorProps(isDisabled)}
      >
        <LiquidGlassShell>{children}</LiquidGlassShell>
      </a>
    );
  }

  const isDisabled = props.disabled;

  return (
    <button
      type="button"
      className={classes}
      disabled={isDisabled}
      {...stripButtonShell(props)}
    >
      <LiquidGlassShell>{children}</LiquidGlassShell>
    </button>
  );
}
