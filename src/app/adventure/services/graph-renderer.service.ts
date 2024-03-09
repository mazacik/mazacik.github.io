import { Injectable } from "@angular/core";

@Injectable({
  providedIn: 'root',
})
export class GraphRendererService {

  constructor(
    // private stateService: AdventureStateService,
    // private editorService: AdventureEditorService
  ) {
    // (window as any).onNodeClick = (nodeId: string) => this.onNodeClick(nodeId);
    // mermaid.initialize({ startOnLoad: false, securityLevel: 'loose' });
  }

  private onNodeClick(nodeId: string): void {
    // switch (nodeType) {
    //   case EditorMode.PAGE:
    //     const page: DialogueNode = this.stateService.getNode(nodeId);
    //     if (this.stateService.currentScenario.id != page.parentScenarioId) {
    //       this.stateService.currentScenario = this.stateService.getScenario(page.parentScenarioId);
    //       this.renderNotes();
    //     }

    //     this.editorService.openScenarioEditor(this.stateService.currentScenario);
    //     this.editorService.openDialogueNodeEditor(this.stateService.getNode(nodeId), this.stateService.currentScenario);
    //     break;
    //   case EditorMode.BUTTON:
    //     const scenario: Scenario = this.stateService.currentScenario;
    //     const button: Button = this.stateService.getButton(nodeId);

    //     this.editorService.openScenarioEditor(scenario);
    //     this.editorService.openButtonEditor(button, scenario);
    //     break;
    // }
  }

  public renderNotes(): void {
    // if (this.editorService.flowchartVisible) {
    //   const collector: string[] = ['flowchart TB'];
    //   this.process(collector);
    //   const data: string = collector.join('\n');

    //   const elements: HTMLElement[] = Array.from(document.getElementsByClassName('flowchart')) as HTMLElement[];
    //   for (const element of elements) {
    //     element.innerHTML = data;
    //     element.removeAttribute('data-processed');
    //   }

    //   mermaid.run({ nodes: elements, suppressErrors: true });
    // }
  }

  private process(collector: string[]): void {
    // for (const page of this.stateService.currentScenario.nodes) {
    //   collector.push(page.id + '[' + page.lines + ']');
    //   collector.push('click ' + page.id + ' call onNodeClick(' + EditorMode.PAGE + ', ' + page.id + ')');

    //   for (const buttonId of page.buttonIds) {
    //     collector.push(page.id + ' --> ' + buttonId);
    //   }
    // }

    // for (const button of this.stateService.currentScenario.buttons) {
    //   collector.push(button.id + '([' + button.text + '])');
    //   collector.push('click ' + button.id + ' call onNodeClick(' + EditorMode.BUTTON + ', ' + button.id + ')');

    //   for (const logic of button.logic) {
    //     for (const action of logic.actions) {
    //       if (action.nextNodeId) {
    //         collector.push(button.id + ' --> ' + action.nextNodeId);
    //         if (!this.stateService.currentScenario.nodes.map(page => page.id).includes(action.nextNodeId)) {
    //           const page: DialogueNode = this.stateService.getNode(action.nextNodeId);
    //           collector.push(page.id + '["(' + this.stateService.getScenario(page.parentScenarioId).label + ')" ' + page.lines + ']');
    //           collector.push('click ' + page.id + ' call onNodeClick(' + EditorMode.PAGE + ', ' + page.id + ')');
    //         }
    //       }
    //     }
    //   }
    // }
  }

}
