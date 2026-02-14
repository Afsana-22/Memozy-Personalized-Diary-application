import * as React from "react";

import { cn } from "@/lib/utils";

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(({ className, ...props }, ref) => {
  // enable browser spellcheck by default and set a sensible default language
  const finalSpell = props.spellCheck !== undefined ? props.spellCheck : true;
  const finalLang = (props as any).lang || 'en-US';

  return (
    <textarea
      className={cn(
        "flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      ref={ref}
      spellCheck={finalSpell}
      lang={finalLang}
      {...props}
    />
  );
});
Textarea.displayName = "Textarea";

export { Textarea };
