import { Node, mergeAttributes, InputRule, Plugin } from '@tiptap/core';
import katex from 'katex';
import { Slice, Fragment } from 'prosemirror-model'; // Required for paste rule manipulation

export interface LatexInlineNodeOptions {
  HTMLAttributes: Record<string, any>;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    latexInlineNode: {
      /**
       * Set a latex-inline node
       */
      setLatexInlineNode: (options: { content: string }) => ReturnType;
    };
  }
}

export const LatexInlineNode = Node.create<LatexInlineNodeOptions>({
  name: 'latexInlineNode',
  group: 'inline',
  inline: true,
  atom: true, // Ensures the node is treated as a single, indivisible unit

  addOptions() {
    return {
      HTMLAttributes: {},
    };
  },

  addAttributes() {
    return {
      content: {
        default: '',
        parseHTML: (element) => element.getAttribute('data-latex-content'),
        renderHTML: (attributes) => {
          if (!attributes.content) {
            return {};
          }
          return { 'data-latex-content': attributes.content };
        },
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'span[data-latex-inline]',
      },
    ];
  },

  renderHTML({ HTMLAttributes, node }) {
    const latexContent = node.attrs.content;
    let html = '';
    try {
      html = katex.renderToString(latexContent, {
        throwOnError: false, // Don't throw errors, just log them
        displayMode: false, // Render inline
      });
    } catch (e: any) {
      console.error('KaTeX rendering error:', e.message, 'for content:', latexContent);
      // Return the original content or an error message if KaTeX fails
      return [
        'span',
        mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
          'data-latex-inline': true,
          class: 'latex-render-error',
        }),
        `Error: ${latexContent}`,
      ];
    }

    const span = document.createElement('span');
    span.innerHTML = html;
    const katexElement = span.firstChild as HTMLElement; // KaTeX usually wraps in a .katex span

    return [
      'span',
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        'data-latex-inline': true,
        // If KaTeX adds its own class like 'katex', we might not need an extra one
        // class: 'rendered-latex-inline' 
      }),
      katexElement || `[KaTeX Error: ${latexContent}]`, // Return the KaTeX element or error
    ];
  },
  
  // Return the original LaTeX string when editor.getText() is called
  // or when content is serialized to text.
   toPredictedText({ node }): string {
     return `${node.attrs.content}`;
   },


  addCommands() {
    return {
      setLatexInlineNode:
        (options) =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs: options,
          });
        },
    };
  },

  addInputRules() {
    return [
      new InputRule({
        find: /\$([^\$\s]+(?:\s+[^\$\s]+)*)\$$/, // Regex to capture content between $...$
        handler: ({ range, match, commands }) => {
          const content = match[1]; // The LaTeX code
          if (content) {
            commands.deleteRange(range);
            commands.insertContent({
              type: this.name,
              attrs: { content },
            });
          }
        },
      }),
    ];
  },

  addProseMirrorPlugins() {
    return [
      new Plugin({
        props: {
          transformPastedHTML: (html) => {
            // This is a simplistic approach. For more robust HTML processing,
            // you might need a more sophisticated parser or rely on Tiptap's
            // default HTML parsing and then transform nodes.
            // For now, we'll focus on plain text paste.
            return html;
          },
          transformPastedText: (text, view) => {
            const regex = /\$([^\$\s]+(?:\s+[^\$\s]+)*)\$/g;
            let match;
            let newNodes: Fragment = Fragment.empty;
            let lastIndex = 0;

            while ((match = regex.exec(text)) !== null) {
              const [fullMatch, content] = match;
              const start = match.index;
              const end = start + fullMatch.length;

              // Add text before the match
              if (start > lastIndex) {
                newNodes = newNodes.append(Fragment.from(view.state.schema.text(text.slice(lastIndex, start))));
              }
              
              // Add the LaTeX node
              if (content) {
                const node = this.type.create({ content });
                newNodes = newNodes.append(Fragment.from(node));
              }
              lastIndex = end;
            }

            // Add any remaining text after the last match
            if (lastIndex < text.length) {
              newNodes = newNodes.append(Fragment.from(view.state.schema.text(text.slice(lastIndex))));
            }
            
            // If any replacements were made, return a new Slice
            if (newNodes.size > 0 && lastIndex > 0) { // lastIndex > 0 implies at least one match
                // It's better to return a Slice from the new nodes
                // For simple text replacement leading to inline nodes, this can be tricky.
                // A common pattern for paste is to let Tiptap parse it and then run a transaction.
                // However, for direct text to node conversion:
                // This approach might not directly work as transformPastedText expects string.
                // Let's adjust to a more common Tiptap pattern: using a transaction in appendTransaction
                // For now, we will mark where to insert and handle it with a command after paste.
                // This is complex. A simpler way for paste rule is using `insertContent` command if possible,
                // but `transformPastedText` doesn't directly allow that.

                // Simpler approach for now: if the entire pasted text is a single LaTeX expression
                if (newNodes.childCount === 1 && newNodes.firstChild?.type === this.type && lastIndex === text.length && text.startsWith('$') && text.endsWith('$')) {
                    // This is a bit of a hack for transformPastedText.
                    // Ideally, Tiptap would handle Slice creation from nodes better here.
                    // We are returning the original LaTeX string, but the input rule should catch it if it's typed.
                    // For paste, it's better to handle this by creating a node directly if the text *only* matches.
                    // Or, more robustly, by extending Tiptap's paste handling.

                    // Fallback: Let Tiptap handle it and rely on an input rule-like mechanism or parseHTML.
                    // The most robust way is often to create a custom plugin that listens to the "pasted" event.
                    // Given the constraints of `transformPastedText` returning a string,
                    // we cannot directly return a node structure.
                    // We will return the text as is, and then try to convert it using another mechanism if needed,
                    // or rely on the user re-typing the '$' if it doesn't auto-convert.

                    // A better way to handle paste for specific patterns is often to create a custom ProseMirror plugin
                    // that inspects the pasted slice and dispatches a transaction to replace text with nodes.
                    // Modifying `transformPastedText` to return a string that then gets re-parsed by input rules
                    // can be unreliable.

                    // For this iteration, let's assume the input rule might catch some cases,
                    // or we might need a more advanced paste handler plugin later.
                    // The goal here is to replace direct paste of "$formula$"
                    
                    // If the entire text is one formula:
                     const singleMatch = /^\$([^\$\s]+(?:\s+[^\$\s]+)*)\$$/.exec(text);
                     if (singleMatch && singleMatch[1]) {
                       // We can't return a node here. We return a string that we hope Tiptap can process.
                       // Or, we can try to insert it via a command immediately after, but that's tricky from here.
                       // For now, let's log and see. The input rule is more reliable for typing.
                       console.log("Pasted LaTeX detected, but transformPastedText expects string return.", text);
                     }
                }
            }
            return text; // Return original text, paste handling for this is non-trivial with transformPastedText
          },
          // A more robust solution would be to use a custom plugin and handle the 'paste' event.
          // For example, using appendTransaction:
          appendTransaction: (transactions, oldState, newState) => {
            let modified = false;
            const tr = newState.tr;
            transactions.forEach(transaction => {
              if (transaction.getMeta('uiEvent') === 'paste') {
                transaction.steps.forEach(step => {
                  step.getMap().forEach((oldStart, oldEnd, newStart, newEnd) => {
                    newState.doc.nodesBetween(newStart, newEnd, (node, pos) => {
                      if (node.isText) {
                        const text = node.text || '';
                        const regex = /\$([^\$\s]+(?:\s+[^\$\s]+)*)\$/g;
                        let match;
                        let lastIndex = 0;
                        while ((match = regex.exec(text)) !== null) {
                          const [fullMatch, content] = match;
                          const start = match.index;
                          const end = start + fullMatch.length;
                          
                          if (content) {
                            const from = pos + start;
                            const to = pos + end;
                            tr.replaceWith(from, to, this.type.create({ content }));
                            modified = true;
                          }
                          lastIndex = end;
                        }
                      }
                    });
                  });
                });
              }
            });
            if (modified) {
              return tr;
            }
            return null;
          }
        },
      }),
    ];
  },
});
