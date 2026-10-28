const PEA_COLORS = ["#FFC04A", "#63C74C", "#30B66F"];

export default function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center gap-2 p-8">
      {PEA_COLORS.map((color, i) => (
        <span
          key={color}
          className="w-3.5 h-3.5 rounded-full animate-bounce"
          style={{ backgroundColor: color, animationDelay: `${i * 150}ms` }}
        />
      ))}
    </div>
  );
}
