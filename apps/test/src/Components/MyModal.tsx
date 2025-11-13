import type { Modal } from "@next-bricks/containers/modal";
import { type Ref, useImperativeHandle, useRef } from "@next-tsx/core";

export interface MyModalRef {
  open: () => void;
}

export default function MyModal({ ref }: { ref?: Ref<MyModalRef> }) {
  const modalRef = useRef<Modal | null>(null);
  const formRef = useRef<any | null>(null);
  useImperativeHandle(ref, () => ({
    open: () => {
      modalRef.current?.open();
    },
    setInitValue: (value: unknown) => {
      formRef.current?.setInitValue(value);
    },
  }));

  return null;
}
