module.exports = {
  clearMocks: true,
  moduleFileExtensions: [ 'js', 'ts' ],
  prettierPath: null,
  reporters: [
    'default',
    'github-actions'
  ],
  testEnvironment: 'node',
  testMatch: [ '**/*.test.ts' ],
  transform: {
    '^.+\\.ts$': 'ts-jest'
  },
  verbose: true
}
