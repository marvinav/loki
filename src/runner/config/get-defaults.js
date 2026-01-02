import defaults from './defaults-react.json' with { type: "json" };;

function getDefaults() {
  return Object.assign({}, defaults, {
    configurations: defaults.configurations,
  });
}

export default getDefaults;
