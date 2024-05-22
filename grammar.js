const PREC = {
  parenthesized_expression: 1,

  comparison: 13,
  bitwise_or: 14,
  bitwise_and: 15,
  xor: 16,
  plus: 18,
  times: 19,
  unary: 20,
  power: 21,
  call: 22,
};

const SEMICOLON = ';';

module.exports = grammar({
  name: 'bend',

  extras: $ => [
    $.comment,
    /[\s\f\uFEFF\u2060\u200B]|\r?\n/,
  ],

  externals: $ => [
    $._newline,
    $._indent,
    $._dedent,

    // Mark comments as external tokens so that the external scanner is always
    // invoked, even if no external token is expected. This allows for better
    // error recovery, because the external scanner can maintain the overall
    // structure by returning dedent tokens whenever a dedent occurs, even
    // if no dedent is expected.
    $.comment,
  ],

  inline: $ => [
    $._simple_statement,
    $._compound_statement,
    $.expression,
    $.simple_expression,
  ],

  conflicts: $ => [
    [$.for_clause],
    [$.eraser],
    [$.constructor, $.superposition],
    [$.lambda_expression, $.constructor],
  ],

  word: $ => $._id,

  rules: {
    source_file: $ => repeat($._top_level_defs),

    _top_level_defs: $ => choice(
      $.function_definition,
      $.object_definition,
      $.type_definition,
    ),

    // Top-level definitions

    function_definition: $ => seq(
      'def',
      field('name', $.identifier),
      field('parameters', $.parameters),
      ':',
      $.body,
    ),

    parameters: $ => seq(
      '(',
      optional($._parameters),
      ')',
    ),

    _parameters: $ => seq(
      commaSep1($.identifier),
      optional(',')
    ),

    body: $ => seq(
      $._indent,
      repeat($._statement),
      $._dedent,
    ),

    object_definition: $ => seq(
      'object',
      $.identifier,
      '{',
      // TODO: allow trailing comma
      field('field', optional(commaSep1($.identifier))),
      '}',
    ),

    type_definition: $ => seq(
      'type',
      $.identifier,
      ':',
      $._type_def_body,
    ),

    _type_def_body: $ => seq(
      $._indent,
      repeat1($.type_constructor),
      $._dedent,
    ),

    type_constructor: $ => seq(
      $.identifier,
      optional($.type_constructor_field),
    ),

    type_constructor_field: $ => seq(
      '{',
      // TODO: maybe create a node or field for the recursive field?
      commaSep1(choice(
        seq('~', $.identifier),
        $.identifier,
      )),
      optional(','),
      '}'
    ),

    _statement: $ => choice(
      $._simple_statements,
      $._compound_statement,
    ),

    // Simple statements

    _simple_statements: $ => seq(
      $._simple_statement,
      optional(SEMICOLON),
      $._newline,
    ),

    _simple_statement: $ => choice(
      $.return_statement,
      $.assignment_statement,
      $.aug_assignment_statement,
      $.use_statement,
      $.open_statement,
    ),

    open_statement: $ => seq(
      'open',
      field('type', $.identifier),
      ':',
      field('var', $.identifier)
    ),

    return_statement: $ => seq(
      'return',
      $.expression,
    ),

    assignment_statement: $ => seq(
      field('pattern', choice(
        $.identifier,
        $.unscoped_var,
        $.tuple,
        $.superposition,
        $.eraser,
        '_' // TODO: alias to something?
      )),
      choice('=', '<-'),
      $.expression
    ),

    aug_assignment_statement: $ => seq(
      $.identifier,
      choice(
        '+=',
        '-=',
        '*=',
        '/=',
      ),
      $.expression
    ),

    use_statement: $ => seq('use', alias($.assignment_statement, 'value')),

    // Compound statements

    _compound_statement: $ => choice(
      $.if_statement,
      $.bend_statement,
      $.fold_statement,
      $.match_statement,
      $.switch_statement,
      $.do_statement,
    ),

    do_statement: $ => seq(
      'do',
      $.identifier,
      ':',
      $.body
    ),

    bend_statement: $ => seq(
      'bend',
      $.bind,
      ':',
      $._indent,
      $.when_clause,
      $.else_clause,
      $._dedent,
    ),

    when_clause: $ => seq(
      'when',
      $.expression,
      ':',
      $.body
    ),

    bind: $ => commaSep1(seq(
      $.identifier,
      optional(seq(
        '=',
        $.expression,
      ))
    )),

    fold_statement: $ => seq(
      'fold',
      $.match_bind,
      ':',
      alias($._match_body, $.body),
    ),

    match_bind: $ => seq(
      choice($.identifier, '_'),
      optional(seq(
        '=',
        $.expression
      ))
    ),

    _match_body: $ => seq(
      $._indent,
      repeat($.match_case),
      $._dedent
    ),

    match_case: $ => seq(
      'case',
      $.match_pattern,
      ':',
      $.body
    ),

    match_pattern: $ => choice(
      $.identifier,
      '_'
    ),

    match_statement: $ => seq(
      'match',
      $.match_bind,
      ':',
      alias($._match_body, $.body),
    ),

    switch_statement: $ => seq(
      'switch',
      $.match_bind,
      ':',
      alias($._switch_body, $.body),
    ),

    _switch_body: $ => seq(
      $._indent,
      repeat($.switch_case),
      $._dedent
    ),

    switch_case: $ => seq(
      'case',
      $.switch_pattern,
      ':',
      $.body
    ),

    switch_pattern: $ => choice($.integer, '_'),

    if_statement: $ => seq(
      'if',
      field('condition', $.expression),
      ':',
      $.body,
      repeat($.elif_clause),
      $.else_clause,
    ),

    elif_clause: $ => seq(
      'elif',
      $.expression,
      ':',
      $.body,
    ),

    else_clause: $ => seq(
      'else',
      ':',
      $.body,
    ),

    // Expressions

    expression: $ => choice(
      $.lambda_expression,
      $.simple_expression,
    ),

    simple_expression: $ => choice(
      $.identifier,
      $._literals,
      $.list_comprehension,
      $.unary_op,
      $.binary_op,
      $.comparison_op,
      $.parenthesized_expression,
      $.call_expression,
      $.eraser,
      $.unscoped_var,
    ),

    eraser: $ => seq('*', optional($.parenthesized_expression)),

    call_expression: $ => prec(PREC.call, seq(
      $.identifier,
      $.arguments,
    )),

    arguments: $ => seq(
      '(',
      optional($._args),
      ')',
    ),

    _args: $ => seq(
      commaSep1(choice($._args_with_no_value, $._args_with_value)),
      optional(',')
    ),

    _args_with_no_value: $ => $.expression,
    _args_with_value: $ => seq(
      field('field', $.identifier),
      '=',
      field('value', $.expression)
    ),

    lambda_expression: $ => seq(
      choice('λ', 'lambda'),
      alias(optionalCommaSep1($.expression), $.parameters),
      optional(','),
      ':',
      field('body', $.expression)
    ),

    unscoped_var: $ => seq('$', alias($.identifier, 'name')),

    parenthesized_expression: $ => prec(PREC.parenthesized_expression, seq(
      '(',
      $.expression,
      ')'
    )),

    binary_op: $ => {
      const table = [
        [prec.left, '+', PREC.plus],
        [prec.left, '-', PREC.plus],
        [prec.left, '*', PREC.times],
        [prec.left, '/', PREC.times],
        [prec.left, '%', PREC.times],
        [prec.right, '**', PREC.power],
        [prec.left, '|', PREC.bitwise_or],
        [prec.left, '&', PREC.bitwise_and],
        [prec.left, '^', PREC.xor],
      ];

      return choice(...table.map(([fn, op, precedence]) => fn(precedence, seq(
        $.expression,
        op,
        $.expression
      ))));
    },

    unary_op: $ => prec(PREC.unary, seq(
      choice('-', '+'),
      $.simple_expression,
    )),

    comparison_op: $ => prec.left(PREC.comparison, seq(
      $.simple_expression,
      seq(
        choice(
          '==',
          '<',
          '>',
          '!=',
        ),
        $.simple_expression
      )
    )),

    list_comprehension: $ => seq(
      '[',
      field('body', $.expression),
      $.for_clause,
      optional($.if_clause),
      ']',
    ),

    for_clause: $ => seq(
      'for',
      field('left', $.identifier),
      'in',
      field('right', $.expression),
      optional($.if_clause),
    ),

    if_clause: $ => seq(
      'if',
      $.expression
    ),


    // Literals

    _literals: $ => choice(
      $.integer,
      $.float,
      $.character,
      $.string,
      $.symbol,
      $.list,
      $.tuple,
      $.map,
      $.superposition,
      $.constructor,
    ),

    symbol: _ => token(seq('`', /[a-zA-Z0-9+/]{0,4}/ ,'`')),
    character: _ => token(seq('\'', /[^']+/, '\'')),
    string: _ => token(seq('"', repeat(/[^"]/), '"')),

    integer: _ => token(choice(
      seq(
        choice('0x', '0X'),
        repeat1(/_?[A-Fa-f0-9]+/),
      ),
      seq(
        choice('0b', '0B'),
        repeat1(/_?[0-1]+/),
      ),
      seq(
        repeat1(/[0-9]+_?/),
      ),
    )),

    float: _ => {
      const digits = repeat1(/[0-9]+_?/);
      return token(seq(digits, '.', digits));
    },

    list: $ => seq(
      '[',
      optional(commaSep1($.expression)),
      optional(','),
      ']',
    ),

    tuple: $ => seq(
      '(',
      optional(commaSep1($.expression)),
      optional(','),
      ')',
    ),

    constructor: $ => seq(
      $.identifier,
      '{',
      commaSep1($._cons_pair),
      '}'
    ),

    _cons_pair: $ => seq(
      field('field', $.identifier),
      ':',
      field('value', $.expression)
    ),

    map: $ => seq(
      '{',
      optional(commaSep1($._pair)),
      optional(','),
      '}',
    ),

    _pair: $ => seq(
      field('key', $._literals),
      ':',
      field('value', $.expression),
    ),

    superposition: $ => seq(
      '{',
      optionalCommaSep1($.expression),
      optional(','),
      '}',
    ),

    _id: _ => /[a-zA-Z][A-Za-z0-9.-/]*/,
    // Identifier without two consecutive underscores __
    _top_level_identifier: _ => /[a-zA-Z][A-Za-z0-9.-/]*(?:_[A-Za-z0-9.-/]+)*/,

    identifier: $ => choice($._id, $._top_level_identifier),

    comment: _ => token(seq('#', /.*/)),

  },
});

/**
 * Creates a rule to match one or more of the rules optionally separated by a comma
 *
 * @param {RuleOrLiteral} rule
 *
 * @return {SeqRule}
 *
 */
function optionalCommaSep1(rule) {
  return repeat1(seq(optional(','), rule))
}

/**
 * Creates a rule to match one or more of the rules separated by a comma
 *
 * @param {RuleOrLiteral} rule
 *
 * @return {SeqRule}
 *
 */
function commaSep1(rule) {
  return sep1(rule, ',');
}

/**
 * Creates a rule to match one or more occurrences of `rule` separated by `sep`
 *
 * @param {RuleOrLiteral} rule
 *
 * @param {RuleOrLiteral} separator
 *
 * @return {SeqRule}
 *
 */
function sep1(rule, separator) {
  return seq(rule, repeat(seq(separator, rule)));
}
