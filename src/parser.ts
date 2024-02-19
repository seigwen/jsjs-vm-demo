import * as acorn from 'acorn';
import { Node, Program, Function, Identifier } from 'estree';
import { UniqueId } from './compiler';

import { traverse } from './traverse';

// 为estree模块的program接口和baseFunction接口添加字段
declare module 'estree' {
  interface Program {
    declarations: Set<string>,
    label: string,
  }

  interface BaseFunction {
    declarations: Set<string>,
    label: string,
  }
}

export class Parser {
  private uniqueId: UniqueId;

  constructor(uniqueId: UniqueId) {
    this.uniqueId = uniqueId;
  }

  /**
   * 转为AST并检查
   * @param code 
   * @returns 
   */
  parse(code: string): (Program | Function)[] {
    // 解析为AST
    const program = acorn.parse(code, {
      ecmaVersion: 5
    }) as Node;
    console.log("\nast:", JSON.stringify(program))


    let blocks: (Program | Function)[] = [];

    traverse<Program | Function>((node, scopeNode, next) => {
      switch (node.type) {
        case 'LabeledStatement':
        case 'ThrowStatement':
        case 'TryStatement':
        case 'ForInStatement':
          throw new Error(`Unsupported Syntax: ${node.type}`);
      }

      // 如何理解此段switch/case
      switch (node.type) {
        case 'Program':
          node.declarations = new Set();
          node.label = '.main_' + this.uniqueId.get();
          blocks.push(node);
          return next(node, node);

        case 'FunctionExpression': {
          node.declarations = new Set();
          node.label = `.${(node.id?.name || 'anonymous')}_${this.uniqueId.get()}`;
          blocks.push(node);
          return next(node, node);
        }

        case 'FunctionDeclaration': {
          scopeNode.declarations.add((node.id as Identifier).name);
          node.declarations = new Set();
          node.label = `.${(node.id?.name || 'anonymous')}_${this.uniqueId.get()}`;
          blocks.push(node);
          return next(node, node);
        }

        case 'VariableDeclaration': {
          for (const declarator of node.declarations) {
            scopeNode.declarations.add(((declarator.id as Identifier).name))
          }
          break;
        }
      }

      return next(node, scopeNode);
    })(program, program as Program);

    return blocks;
  }
}
