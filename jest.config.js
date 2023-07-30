module.exports = {
  clearMocks: true,
  moduleFileExtensions: [ 'js', 'ts' ],
  prettierPath: null,
  reporters: [
    ['github-actions', {silent: false}], 'summary'
  ],
  testEnvironment: 'node',
  testMatch: [ '**/*.test.ts' ],
  transform: {
    '^.+\\.ts$': 'ts-jest'
  },
  verbose: true
}
