use arbitrary_fixed::ArbitraryFixed;

pub const fn include_dir() -> &'static str {
	env!("OUT_DIR")
}

pub fn arb_to_array(a: ArbitraryFixed) -> String {
    a.data
        .iter()
        .map(|k| format!("    {:#010X}", k))
        .collect::<Vec<_>>()
        .join(",\n")
}

pub fn write_const<T: std::io::Write>(f: &mut T, name: &str, a: ArbitraryFixed) -> std::io::Result<()> {
    writeln!(
        f,
        "const uint[SIZE] {} = {{\n{}\n}};",
        name,
        &arb_to_array(a)
    )
}

pub fn write_table<T: std::io::Write>(
    f: &mut T,
    name: &str,
    len: usize,
    table_function: fn(usize) -> ArbitraryFixed,
) -> std::io::Result<()> {
    writeln!(
        f,
        "const uint[][SIZE] {} = {{\n{}\n}};",
        name,
        (0..len)
            .map(|i| format!("  {{\n{}\n  }}", arb_to_array(table_function(i))))
            .collect::<Vec<_>>()
            .join(",\n")
    )
}
