module.exports = {
  clearMocks: true,
  moduleFileExtensions: [ 'js', 'ts' ],
  prettierPath: null,
  testEnvironment: 'node',
  testMatch: [ '**/*.test.ts' ],
  transform: {
    '^.+\\.ts$': 'ts-jest'
  },
  verbose: true
}
