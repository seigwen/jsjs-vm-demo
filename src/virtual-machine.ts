import { OpCode } from "./constrains";

export class Scope {
  private parent?: Scope;
  private content: Map<string, unknown> = new Map();

  constructor(parent?: Scope) {
    this.parent = parent;
  }

  // 在作用域添加变量并设置其值为undefined
  var(name: string) {
    this.content.set(name, undefined);
  }

  // 从作用域获取变量
  load(name: string): unknown {
    if (this.content.has(name)) {
      return this.content.get(name);
    } else if (this.parent) {
      return this.parent.load(name);
    }
    throw new Error(`Variable ${name} not found`);
  }

  // 更改作用域的变量的值
  out(name: string, value: unknown): unknown {
    if (this.content.has(name)) {
      this.content.set(name, value);
      return value;
    } else if (this.parent) {
      return this.parent.out(name, value);
    }
    throw new Error(`Variable ${name} not found`);
  }
}

export class GlobalScope extends Scope {
  private global: any;
  constructor(global: any) {
    super()
    this.global = global;
  }

  load(name: string) {
    try { return super.load(name) } catch (e) { }
    if (this.global.hasOwnProperty(name)) {
      return this.global[name];
    }
    throw new Error(`Variable ${name} not found`);
  }

  out(name: string, value: unknown) {
    try { return super.out(name, value) } catch (e) { }
    this.global[name] = value;
  }
}

export class VirtualMachine {

  private scope: any;
  private codes: number[];
  private stack: unknown[];
  private pc: number; // VM从第${pc}个操作码开始执行

  constructor(scope: any, codes: number[], pc: number = 0, stack: unknown[] = []) {
    this.scope = scope;
    this.codes = codes;
    this.pc = pc;
    this.stack = stack;
  }

  private loadAddress() {
    const dv = new DataView(new ArrayBuffer(8));
    for (let i = 0; i < 4; i++) {
      dv.setUint8(i, this.codes[this.pc + i]);
    }
    this.pc += 4;
    this.stack.push(dv.getUint32(0));
  }

  private loadNumber() {
    const dv = new DataView(new ArrayBuffer(8));
    for (let i = 0; i < 8; i++) {
      dv.setUint8(i, this.codes[this.pc + i]);
    }
    this.pc += 8;
    this.stack.push(dv.getFloat64(0));
  }

  private loadString() {
    const dv = new DataView(new ArrayBuffer(2));
    let str = '';
    for (let i = 0; true; i += 2) {
      dv.setUint16(0, this.codes[this.pc + i] << 8 | this.codes[this.pc + i + 1]);
      const charCode = dv.getUint16(0);
      if (charCode) {
        str += String.fromCharCode(charCode);
      } else {
        this.pc = this.pc + i + 2;
        this.stack.push(str);
        return;
      }
    }
  }

  run() {
    while (true) {
      const code = this.codes[this.pc++];
      console.log("stack:",this.stack);
      console.log("code to be executed:", code)

      switch (code) {
        case OpCode.NOP: break;

        // 变量入栈
        case OpCode.UNDEF: this.stack.push(undefined); break;
        case OpCode.NULL: this.stack.push(null); break;
        case OpCode.OBJ: this.stack.push({}); break;
        case OpCode.ARR: this.stack.push([]); break;
        case OpCode.TRUE: this.stack.push(true); break;
        case OpCode.FALSE: this.stack.push(false); break;

        // 数字转为float64入栈
        case OpCode.NUM: this.loadNumber(); break;
        // 地址入栈
        case OpCode.ADDR: this.loadAddress(); break;
        // 字符串入栈
        case OpCode.STR: this.loadString(); break;

        // 出栈
        case OpCode.POP: this.stack.pop(); break;
        // 栈顶变量再次入栈
        case OpCode.TOP: this.stack.push(this.stack[this.stack.length - 1]); break;
        // 栈顶两个变量再次入栈
        case OpCode.TOP2: this.stack.push(
          this.stack[this.stack.length - 2],
          this.stack[this.stack.length - 1],
        ); break;

        // 栈顶变量移动到局部变量区
        case OpCode.VAR: this.scope.var(this.stack.pop()); break;
        // 从栈顶弹出变量名称,根据该变量称从作用域获取变量值,把变量值入栈
        case OpCode.LOAD: this.stack.push(this.scope.load(this.stack.pop())); break;
        // 从栈顶弹出变量名称和变量值,更改作用域的变量的值
        case OpCode.OUT: this.stack.push(this.scope.out(this.stack.pop(), this.stack.pop())); break;

        // 跳转
        case OpCode.JUMP: this.pc = this.stack.pop() as number; break;
        // 跳转到条件判断语句为true
        case OpCode.JUMPIF: {
          const addr = this.stack.pop();
          const test = this.stack.pop();
          if (test) { this.pc = addr as number };
          break;
        }
        // 跳转到条件判断语句为false
        case OpCode.JUMPNOT: {
          const addr = this.stack.pop();
          const test = this.stack.pop();
          if (!test) { this.pc = addr as number };
          break;
        }

        // 函数声明
        case OpCode.FUNC: {
          const addr = this.stack.pop();
          const len = this.stack.pop(); 
          const name = this.stack.pop();
          const _this = this;

          const func = function (this: any, ...args: unknown[]) {
            const scope = new Scope(_this.scope);
            scope.var('this');
            scope.out('this', this);
            if (name) {
              scope.var(name as string);
              scope.out(name as string, func);
            }
            const vm = new VirtualMachine(scope, _this.codes, addr as number, [args]);
            return vm.run();
          }

          Object.defineProperty(func, 'name', { value: name });
          Object.defineProperty(func, 'length', { value: len });

          this.stack.push(func);
          break;
        }
        // 函数直接调用
        case OpCode.CALL: {
          const args = this.stack.pop();
          const func = this.stack.pop() as Function;
          const _this = this.stack.pop();
          this.stack.push(func.apply(_this, args));
          break;
        }
        // 函数new调用
        case OpCode.NEW: {
          const args = this.stack.pop() as unknown[];
          const func = this.stack.pop() as Function;
          this.stack.push(new (func.bind.apply(func, [null, ...args])));
          break;
        }
        // 函数返回
        case OpCode.RET: return this.stack.pop();

        // 对象操作
        // 属性读
        case OpCode.GET: {
          const key = this.stack.pop() as string;
          const object = this.stack.pop() as any;
          this.stack.push(object[key])
          break;
        }
        // 属性写
        case OpCode.SET: {
          const value = this.stack.pop();
          const key = this.stack.pop() as string;
          const object = this.stack.pop() as any;
          this.stack.push(object[key] = value)
          break;
        }
        // 属性全部读
        case OpCode.IN: {
          const key = this.stack.pop() as string;
          const object = this.stack.pop() as any;
          this.stack.push(key in object);
          break;
        }
        // 属性删除
        case OpCode.DELETE: {
          const key = this.stack.pop() as string;
          const object = this.stack.pop() as any;
          this.stack.push(delete object[key]);
        }

        // 表运算
        case OpCode.EQ: {
          const right = this.stack.pop();
          const left = this.stack.pop();
          this.stack.push(left == right);
          break;
        }
        case OpCode.NEQ: {
          const right = this.stack.pop();
          const left = this.stack.pop();
          this.stack.push(left != right);
          break;
        }
        case OpCode.SEQ: {
          const right = this.stack.pop();
          const left = this.stack.pop();
          this.stack.push(left === right);
          break;
        }
        case OpCode.SNEQ: {
          const right = this.stack.pop();
          const left = this.stack.pop();
          this.stack.push(left !== right);
          break;
        }
        case OpCode.LT: {
          const right = this.stack.pop() as any;
          const left = this.stack.pop() as any;
          this.stack.push(left < right);
          break;
        }
        case OpCode.LTE: {
          const right = this.stack.pop() as any;
          const left = this.stack.pop() as any;
          this.stack.push(left <= right);
          break;
        }
        case OpCode.GT: {
          const right = this.stack.pop() as any;
          const left = this.stack.pop() as any;
          this.stack.push(left > right);
          break;
        }
        case OpCode.GTE: {
          const right = this.stack.pop() as any;
          const left = this.stack.pop() as any;
          this.stack.push(left >= right);
          break;
        }

        // 数学运算
        case OpCode.ADD: {
          const right = this.stack.pop() as any;
          const left = this.stack.pop() as any;
          this.stack.push(left + right);
          break;
        }
        case OpCode.SUB: {
          const right = this.stack.pop() as any;
          const left = this.stack.pop() as any;
          this.stack.push(left - right);
          break;
        }
        case OpCode.MUL: {
          const right = this.stack.pop() as any;
          const left = this.stack.pop() as any;
          this.stack.push(left * right);
          break;
        }
        case OpCode.EXP: {
          const right = this.stack.pop() as any;
          const left = this.stack.pop() as any;
          this.stack.push(left ** right);
          break;
        }
        case OpCode.DIV: {
          const right = this.stack.pop() as any;
          const left = this.stack.pop() as any;
          this.stack.push(left / right);
          break;
        }
        case OpCode.MOD: {
          const right = this.stack.pop() as any;
          const left = this.stack.pop() as any;
          this.stack.push(left % right);
          break;
        }

        // 位运算
        case OpCode.BNOT: {
          const arg = this.stack.pop() as any;
          this.stack.push(~arg);
          break;
        }
        case OpCode.BOR:{
          const right = this.stack.pop() as any;
          const left = this.stack.pop() as any;
          this.stack.push(left | right);
          break;
        }
        case OpCode.BXOR:{
          const right = this.stack.pop() as any;
          const left = this.stack.pop() as any;
          this.stack.push(left ^ right);
          break;
        }
        case OpCode.BAND:{
          const right = this.stack.pop() as any;
          const left = this.stack.pop() as any;
          this.stack.push(left & right);
          break;
        }
        case OpCode.LSHIFT:{
          const right = this.stack.pop() as any;
          const left = this.stack.pop() as any;
          this.stack.push(left << right);
          break;
        }
        case OpCode.RSHIFT:{
          const right = this.stack.pop() as any;
          const left = this.stack.pop() as any;
          this.stack.push(left >> right);
          break;
        }
        case OpCode.URSHIFT:{
          const right = this.stack.pop() as any;
          const left = this.stack.pop() as any;
          this.stack.push(left >>> right);
          break;
        }

        // 逻辑运算
        case OpCode.OR:{
          const right = this.stack.pop() as any;
          const left = this.stack.pop() as any;
          this.stack.push(left || right);
          break;
        }
        case OpCode.AND:{
          const right = this.stack.pop() as any;
          const left = this.stack.pop() as any;
          this.stack.push(left && right);
          break;
        }
        case OpCode.NOT:{
          const arg = this.stack.pop() as any;
          this.stack.push(!arg);
          break;
        }

        // 类型运算
        case OpCode.INSOF: {
          const right = this.stack.pop() as any;
          const left = this.stack.pop() as any;
          this.stack.push(left instanceof right);
          break;
        }
        case OpCode.TYPEOF:{
          const arg = this.stack.pop() as any;
          this.stack.push(typeof arg);
          break;
        }

        default:
          throw new Error(`Unexpected code ${code.toString(16).padStart(2, '0')}`);
      }
    }
  }
}