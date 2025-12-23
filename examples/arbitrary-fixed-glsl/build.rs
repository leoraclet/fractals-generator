use std::env;
use std::{io, fs};
use std::fs::File;
use std::io::{BufWriter, Write};
use std::path::Path;

use arbitrary_fixed::ArbitraryFixed;

fn factorial(num: u128) -> u128 {
    (1..=num).product()
}

fn arb_to_array(a: ArbitraryFixed) -> String {
    a.data
        .iter()
        .map(|k| format!("    {:#010X}", k))
        .collect::<Vec<_>>()
        .join(",\n")
}

fn write_const<T: std::io::Write>(f: &mut T, name: &str, a: ArbitraryFixed) -> std::io::Result<()> {
    writeln!(
        f,
        "const uint[SIZE] {} = {{\n{}\n}};",
        name,
        &arb_to_array(a)
    )
}

fn write_table<T: std::io::Write>(
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

fn write_constant_file(out_dir: &str) -> std::io::Result<()> {
    let mut f = BufWriter::new(File::create(Path::new(out_dir).join("constants.glsl"))?);

    writeln!(f, "const uint SIZE = {};", arbitrary_fixed::SIZE)?;
    writeln!(
        f,
        "const uint SCALING_FACTOR = {};\n",
        arbitrary_fixed::SCALING_FACTOR
    )?;

    const TRIG_PRECISION: usize = 6;
    const LOG_PRECISION: usize = 6;

    writeln!(f, "const uint TRIG_PRECISION = {TRIG_PRECISION};")?;
    writeln!(f, "const uint LOG_PRECISION = {LOG_PRECISION};")?;

    write_table(&mut f, "sin_table", TRIG_PRECISION, |i| {
        let adj = TRIG_PRECISION - i;
        ArbitraryFixed::from(1 - (2 * ((adj % 2) as i128)))
            / ArbitraryFixed::from(factorial(2 * adj as u128))
    })?;

    write_table(&mut f, "log_table", LOG_PRECISION, |i| {
        let adj = LOG_PRECISION - i - 1;
        ArbitraryFixed::from(2u32) / ArbitraryFixed::from(2 * (adj as u32) + 1)
    })?;

    write_const(&mut f, "FIX_2_PI", ArbitraryFixed::gen_pi().lshift1())?;
    write_const(&mut f, "FIX_PI", ArbitraryFixed::gen_pi())?;
    write_const(&mut f, "FIX_PI_2", ArbitraryFixed::gen_pi().rshift1())?;
    write_const(&mut f, "FIX_LN_2", ArbitraryFixed::gen_ln_2())?;
    write_const(&mut f, "FIX_ZERO", ArbitraryFixed::from(0u32))?;
    write_const(&mut f, "FIX_ONE", ArbitraryFixed::from(1u32))?;
    write_const(&mut f, "FIX_NEG_ONE", ArbitraryFixed::from(-1i128))?;
    write_const(&mut f, "FIX_TWO", ArbitraryFixed::from(2u32))?;
    write_const(
        &mut f,
        "FIX_48_DIV_17",
        ArbitraryFixed::from(48u32) / ArbitraryFixed::from(17u32),
    )?;
    write_const(
        &mut f,
        "FIX_NEG_32_DIV_17",
        -(ArbitraryFixed::from(32u32) / ArbitraryFixed::from(17u32)),
    )?;

    Ok(())
}



fn copy_dir_all(src: impl AsRef<Path>, dst: impl AsRef<Path>) -> io::Result<()> {
    fs::create_dir_all(&dst)?;
    for entry in fs::read_dir(src)? {
        let entry = entry?;
        let ty = entry.file_type()?;
        if ty.is_dir() {
            copy_dir_all(entry.path(), dst.as_ref().join(entry.file_name()))?;
        } else {
            fs::copy(entry.path(), dst.as_ref().join(entry.file_name()))?;
        }
    }
    Ok(())
}

fn main() -> std::io::Result<()> {
    println!("cargo:rerun-if-env-changed=FIX_SIZE");
    println!("cargo:rerun-if-env-changed=FIX_SCALING_FACTOR");
    println!("cargo:rerun-if-changed=build.rs");

    let out_dir = env::var("OUT_DIR").unwrap();

    write_constant_file(&out_dir)?;
    copy_dir_all("./glsl", out_dir)?;

    Ok(())
}
