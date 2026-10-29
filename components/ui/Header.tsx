import type { ReactNode } from "react";
import { Icon } from "@/components/icons";
import { common } from "@/lib/copy/es";
import { IconLink } from "./IconButton";

type Props = {
  back?: string;
  close?: string;
  title?: string;
  titleSize?: number;
  right?: ReactNode;
};

// Top row: back or close button on the left, optional centred title, optional element on the right.
export function Header({ back, close, title, titleSize = 20, right }: Props) {
  const left = back ? (
    <IconLink href={back} label={common.back}>
      <Icon name="back" />
    </IconLink>
  ) : close ? (
    <IconLink href={close} label={common.close}>
      <Icon name="close" size={20} strokeWidth={2.8} />
    </IconLink>
  ) : (
    <span className="w-11" />
  );
  return (
    <div className="flex items-center justify-between">
      {left}
      {title && (
        <h1 className="m-0 font-display font-bold" style={{ fontSize: titleSize }}>
          {title}
        </h1>
      )}
      {right ?? <span className="w-11" />}
    </div>
  );
}
