import { Toaster as Sonner } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      className="toaster group"
      toastOptions={{
        classNames: {
          toast: "candy-toast",
          title: "candy-toast-title",
          description: "candy-toast-desc",
          actionButton: "candy-toast-action",
          cancelButton: "candy-toast-close",
          closeButton: "candy-toast-close",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
