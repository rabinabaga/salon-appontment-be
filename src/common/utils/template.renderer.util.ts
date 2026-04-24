/**
 * Renders a notification template body by replacing
 * {{placeholder}} tokens with actual values.
 */
export class TemplateRenderer {
  static render(template: string, variables: Record<string, string>): string {
    return template.replace(/\{\{(\w+)\}\}/g, (_, key) => variables[key] ?? `{{${key}}}`);
  }
}