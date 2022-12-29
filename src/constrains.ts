/*
  二进制文件:
*/

// 操作码 8 位
export enum OpCode {
  // 空指令，占位用
  NOP = 0x00,

  // 数据入栈
  UNDEF = 0x01,
  NULL = 0x02,
  OBJ = 0x03, // 空对象入栈
  ARR = 0x04, // 空数组入栈
  TRUE = 0x05,
  FALSE = 0x06,
  NUM = 0x07, // 数字入栈.后面跟 64 位 double 数字字面量
  ADDR = 0x08, // 地址入栈.后面跟地址引用名, 再然后一般跟JUMP\JUMPNOT\FUNC
  STR = 0x09, // 字符串入栈.后面跟 16 位为一个字符长度 0x0000 表示结尾的字符串字面量

  // 基本栈操作
  POP = 0x0A,  // 栈顶变量出栈
  // SWP = 0x0B,
  // CLEAN = 0x0C,
  TOP = 0x0D, // 入栈
  TOP2 = 0x0E,  // 入栈2个变量

  // 数据存储
  VAR = 0x10,  // 变量从栈顶挪到局部变量区(用scope属性来模拟).
  LOAD = 0x11,  // 从栈顶弹出变量名称,根据该变量名称,从scope属性获取变量值,把变量值入栈
  OUT = 0x12,  // 从栈顶弹出变量名称和变量值,更改scope属性的该变量的值

  // 分支跳转
  JUMP = 0x20,  // 跳到从栈中弹出的地址
  JUMPIF = 0x21, // 如果从栈中弹出的test结果为true,则跳到从栈中弹出的地址
  JUMPNOT = 0x22, // 如果从栈中弹出的test结果为false,则跳到从栈中弹出的地址

  // 函数
  FUNC = 0x30,  // 根据上一步从栈中弹出的函数地址/参数数量/函数名称,创建函数对象,并将其入栈
  CALL = 0x31,  
  NEW = 0x32,
  RET = 0x33,  // 函数返回

  // 对象操作
  GET = 0x40,
  SET = 0x41,
  // KEYS = 0x42,
  IN = 0x43, // in
  DELETE = 0x44, // delete

  // 表运算
  EQ = 0x50, // ==
  NEQ = 0x51, // !=
  SEQ = 0x52, // ===
  SNEQ = 0x53, // !==
  LT = 0x54, // <
  LTE = 0x55, // <=
  GT = 0x56, // >
  GTE = 0x57,  // >=

  // 数学运算
  ADD = 0x60, // +
  SUB = 0x61, // -
  MUL = 0x62, // *
  EXP = 0x63, // **
  DIV = 0x64, // /
  MOD = 0x65, // %

  // 位运算
  BNOT = 0x70, // ~
  BOR = 0x71, // |
  BXOR = 0x72, // ^
  BAND = 0x73,// &
  LSHIFT = 0x73, // <<
  RSHIFT = 0x75, // >>
  URSHIFT = 0x76,// >>>

  // 逻辑运算
  OR = 0x80, // ||
  AND = 0x81, // &&
  NOT = 0x82, // !

  // 类型运算
  INSOF = 0x90, // instanceof
  TYPEOF = 0x91, // typeof
}