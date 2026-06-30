import React from "react";

export default function Card({ title, subtitle, right, children, className = "" }) {
  return (
    <section className={`card ${className}`}>
      {(title || right) && (
        <header className="card-head">
          <div>
            <h3>{title}</h3>
            {subtitle && <p className="card-sub">{subtitle}</p>}
          </div>
          {right && <div className="card-right">{right}</div>}
        </header>
      )}
      <div className="card-body">{children}</div>
    </section>
  );
}
