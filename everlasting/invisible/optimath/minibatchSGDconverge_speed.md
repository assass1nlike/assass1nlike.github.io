# 小批量 SGD 在非凸光滑目标下的收敛性

**迭代复杂度的完整证明**

$$
N \;=\; \tilde O\!\left(\frac{L\bigl(L(\theta_0)-L^\ast\bigr)}{\epsilon^2}\left[\,1+\frac{\sigma^2}{b\,\epsilon^2}\right]\right)
$$

本文遵循 Ghadimi & Lan, *Stochastic First- and Zeroth-Order Methods for Nonconvex Stochastic Programming*, SIAM J. Optim. 23(4):2341–2368, 2013（定理 2.1 与推论 2.2），并把小批量精化与随机输出论证全部写完整。

---

## 0. 设定、符号与基本假设

我们希望在数据下标集 $V$ 上最小化损失

$$
L(\theta) \;=\; \mathbb{E}_{i\in V}\bigl[L_i(\theta)\bigr],\qquad \theta\in\mathbb{R}^n .
$$

为与优化文献保持一致，下面会自由地切换到中性记号

$$
f(\theta) := L(\theta),\qquad f^\ast := L^\ast := \inf_{\theta} L(\theta),
$$

并记 $g_{i,t}=\nabla L_i(\theta_t)$ 为第 $t$ 步处单个样本（per-example）的梯度。

**小批量 SGD。** 学习率 $\eta>0$，每步独立同分布（从 $V$ 中均匀有放回）抽取一个大小为 $b=|M_t|$ 的小批量 $M_t\subseteq V$，更新规则为

$$
\theta_{t+1} \;=\; \theta_t - \eta\, g_{M_t,t},
\qquad
g_{M_t,t} := \frac{1}{b}\sum_{i\in M_t} g_{i,t}.
\tag{0.1}
$$

> **关于两个 $L$ 的说明。** 符号 $L$ 在文献里被重载了。本文中：
> * $L(\theta)$、$L_i(\theta)$、$L^\ast$（带参数或带星号）表示**损失值**；
> * 纯粹的常数 $\mathsf L$（我们用无衬线体 $\mathsf L$ 加以区分）表示下面光滑性假设里的**梯度 Lipschitz 常数**。
>
> 在最终的复杂度公式里，分子中的因子 $L$ 是 Lipschitz 常数 $\mathsf L$，而 $L(\theta_0)-L^\ast$ 是损失值之差。凡是可能混淆的地方，常数一律写 $\mathsf L$，损失一律写 $L(\cdot)$。

### 假设

**(A0) 下有界。** $f^\ast = \inf_\theta f(\theta) > -\infty$。

**(A1) $\mathsf L$-光滑（梯度 Lipschitz）。** $f$ 可微且

$$
\|\nabla f(y)-\nabla f(x)\| \le \mathsf L\,\|y-x\|,\qquad \forall x,y.
\tag{A1}
$$

$f$ **不必**为凸。

**(A2) 无偏随机梯度、方差有界。** 在 $\theta_t$ 处查询的每个单样本梯度都是全梯度的无偏估计，且方差至多为 $\sigma^2$：

$$
\mathbb{E}_{i\in V}\bigl[g_{i,t}\bigr]=\nabla f(\theta_t),
\qquad
\mathbb{E}_{i\in V}\bigl[\|g_{i,t}-\nabla f(\theta_t)\|^2\bigr]\le \sigma^2 .
\tag{A2}
$$

（方差界即问题陈述中的 $\mathbb{E}_{i\in V}[(g_{i,\cdot}-g_{V,\cdot})^2]\le\sigma^2$，其中 $g_{V,\cdot}=\nabla f$。）

我们还允许第 $t$ 步的噪声依赖于历史；只需要*条件*意义下的零均值与方差有界即可。形式上，记 $\mathcal F_{t-1}=\sigma(\theta_1,\dots,\theta_t)$ 为到第 $t$ 步为止的历史，我们使用

$$
\mathbb{E}\bigl[\,g_{M_t,t}\mid \mathcal F_{t-1}\bigr]=\nabla f(\theta_t),
\qquad
\mathbb{E}\bigl[\,\|g_{M_t,t}-\nabla f(\theta_t)\|^2 \mid \mathcal F_{t-1}\bigr]\le \sigma_b^2,
\tag{A2$'$}
$$

其中**小批量方差** $\sigma_b^2$ 将在下面计算。

> **关于撇号记号 $(\text{A2}')$。** 撇号（prime）只是数学写作中"同一假设的变体"的惯用记法，没有特殊含义。$(\text{A2}')$ 是 $(\text{A2})$ 升级后的版本，两处关键改动：(i) 对象从**单样本梯度** $g_{i,t}$ 换成整个**小批量梯度** $g_{M_t,t}$，方差界相应从 $\sigma^2$ 缩减为 $\sigma_b^2=\sigma^2/b$（由引理 0）；(ii) 期望从无条件改成**条件于历史** $\mathcal F_{t-1}=\sigma(\theta_1,\dots,\theta_t)$，即"在已知当前位置 $\theta_t$ 的前提下"无偏且方差有界——这比无条件版本更弱、更现实，允许噪声依赖于走过的轨迹。证明第 3 步消去交叉项 (2.4) 用的塔性质，需要的正是这个条件无偏性。

### $\mathsf L$-光滑性的两个推论

下面用得最多的不等式是**下降引理**，由 (A1) 积分得到：

$$
\boxed{\;f(y)\le f(x)+\langle\nabla f(x),\,y-x\rangle+\frac{\mathsf L}{2}\|y-x\|^2\;}
\qquad\forall x,y.
\tag{0.2}
$$

*(0.2) 的证明。* 写 $f(y)-f(x)=\int_0^1\langle\nabla f(x+s(y-x)),\,y-x\rangle\,ds$。减去 $\langle\nabla f(x),y-x\rangle=\int_0^1\langle\nabla f(x),y-x\rangle\,ds$，再用 Cauchy–Schwarz 与 (A1) 放缩：

$$
\bigl|f(y)-f(x)-\langle\nabla f(x),y-x\rangle\bigr|
\le\int_0^1 \|\nabla f(x+s(y-x))-\nabla f(x)\|\,\|y-x\|\,ds
\le\int_0^1 \mathsf L\,s\,\|y-x\|^2\,ds=\tfrac{\mathsf L}{2}\|y-x\|^2 . \qquad\square
$$

### 小批量方差缩减

**引理 0（小批量均值的方差）。** 在 (A2) 下，若 $M_t$ 由 $b$ 次独立同分布抽样构成，且 $g_{M_t,t}=\frac1b\sum_{i\in M_t}g_{i,t}$，则

$$
\mathbb{E}\bigl[\|g_{M_t,t}-\nabla f(\theta_t)\|^2 \mid \mathcal F_{t-1}\bigr]\;\le\;\frac{\sigma^2}{b}
\quad\Longrightarrow\quad \sigma_b^2=\frac{\sigma^2}{b}.
\tag{0.3}
$$

*证明。* 在 $\mathcal F_{t-1}$ 下取条件（于是 $\theta_t$ 固定）。令 $\xi_i:=g_{i,t}-\nabla f(\theta_t)$，$i\in M_t$。由 (A2)，这些 $\xi_i$ 独立同分布、零均值，且 $\mathbb{E}\|\xi_i\|^2\le\sigma^2$。于是 $g_{M_t,t}-\nabla f(\theta_t)=\frac1b\sum_{i\in M_t}\xi_i$，从而

$$
\mathbb{E}\Bigl\|\tfrac1b\textstyle\sum_{i}\xi_i\Bigr\|^2
=\frac{1}{b^2}\sum_{i}\sum_{j}\mathbb{E}\langle\xi_i,\xi_j\rangle
=\frac{1}{b^2}\sum_{i}\mathbb{E}\|\xi_i\|^2
\le\frac{1}{b^2}\cdot b\,\sigma^2=\frac{\sigma^2}{b},
$$

其中交叉项（$i\ne j$）为零，因为 $\xi_i,\xi_j$ 独立且零均值。$\square$

这一条事实就是最终界中 $1/b$ 因子的全部来源。**下面整个算法都用一个通用的逐步方差 $\sigma_b^2$ 来分析；到最后一步才代入 $\sigma_b^2=\sigma^2/b$。** 当 $b=1$ 时即还原为 Ghadimi–Lan 的纯 SGD 结论。

---

## 1. 随机输出技巧

非凸情形有一个微妙之处：与凸情形不同，我们不能输出迭代平均，也不能输出 $\arg\min_t \|\nabla f(\theta_t)\|$，因为梯度范数不可观测（用蒙特卡洛去估计还会引入额外误差）。Ghadimi & Lan 用**随机选取一个迭代点**来解决这个问题。

**随机化 SGD（RSG），常数步长。** 用常数 $\eta$ 运行 (0.1) 共 $N$ 步。与轨迹独立地抽取一个停止下标 $R\in\{1,\dots,N\}$，输出 $\theta_R$。在常数步长下，最优选择（在 §3 推导）为

$$
\Pr\{R=k\}=\frac{1}{N},\qquad k=1,\dots,N,
\tag{1.1}
$$

即 $R$ **均匀分布**。（对一般的非常数步长 $\gamma_k$，正确的权重是 $\Pr\{R=k\}\propto 2\gamma_k-\mathsf L\gamma_k^2$；均匀分布是 $\gamma_k\equiv\eta$ 的特例。我们在 §2 保留一般步长的推导以便看清结构，再做特化。）

我们将要利用的关键恒等式是：对任意非负权重 $w_k\ge 0$，记 $W=\sum_k w_k$，取 $\Pr\{R=k\}=w_k/W$ 时，

$$
\mathbb{E}\bigl[\|\nabla f(\theta_R)\|^2\bigr]
=\sum_{k=1}^N \Pr\{R=k\}\,\mathbb{E}\bigl[\|\nabla f(\theta_k)\|^2\bigr]
=\frac{\sum_{k=1}^N w_k\,\mathbb{E}\|\nabla f(\theta_k)\|^2}{\sum_{k=1}^N w_k}.
\tag{1.2}
$$

于是（不可观测的）逐步梯度范数的加权平均，就变成了输出点处的一个期望量。而这恰恰是下降引理所能控制的量。

---

## 2. 核心估计（一般步长）

现在证明主不等式。我们允许逐步步长 $\gamma_k>0$（常数情形即 $\eta=\gamma_k$），把更新写为 $\theta_{k+1}=\theta_k-\gamma_k\, G_k$，其中 $G_k:=g_{M_k,k}$ 是小批量梯度，且

$$
\delta_k := G_k-\nabla f(\theta_k)
\tag{2.1}
$$

是（条件意义下）零均值的噪声，由 (A2$'$) 有 $\mathbb{E}[\delta_k\mid\mathcal F_{k-1}]=0$ 且 $\mathbb{E}[\|\delta_k\|^2\mid\mathcal F_{k-1}]\le\sigma_b^2$。

### 第 1 步 —— 逐步下降

对 (0.2) 取 $x=\theta_k$、$y=\theta_{k+1}=\theta_k-\gamma_k G_k$：

$$
f(\theta_{k+1})\le f(\theta_k)-\gamma_k\langle\nabla f(\theta_k),G_k\rangle+\frac{\mathsf L}{2}\gamma_k^2\|G_k\|^2 .
$$

现在在内积**和**平方范数中都代入 $G_k=\nabla f(\theta_k)+\delta_k$。对内积，
$\langle\nabla f(\theta_k),G_k\rangle=\|\nabla f(\theta_k)\|^2+\langle\nabla f(\theta_k),\delta_k\rangle$；
对平方范数，
$\|G_k\|^2=\|\nabla f(\theta_k)\|^2+2\langle\nabla f(\theta_k),\delta_k\rangle+\|\delta_k\|^2$。于是

$$
\begin{aligned}
f(\theta_{k+1})
&\le f(\theta_k)-\gamma_k\|\nabla f(\theta_k)\|^2-\gamma_k\langle\nabla f(\theta_k),\delta_k\rangle\\
&\quad+\frac{\mathsf L}{2}\gamma_k^2\Bigl(\|\nabla f(\theta_k)\|^2+2\langle\nabla f(\theta_k),\delta_k\rangle+\|\delta_k\|^2\Bigr)\\[2pt]
&= f(\theta_k)-\Bigl(\gamma_k-\tfrac{\mathsf L}{2}\gamma_k^2\Bigr)\|\nabla f(\theta_k)\|^2
-\bigl(\gamma_k-\mathsf L\gamma_k^2\bigr)\langle\nabla f(\theta_k),\delta_k\rangle
+\frac{\mathsf L}{2}\gamma_k^2\|\delta_k\|^2 .
\end{aligned}
\tag{2.2}
$$

这正是 Ghadimi–Lan 式 (2.8) 的对应物。

### 第 2 步 —— 对 $k=1,\dots,N$ 求和（裂项）

把 (2.2) 对 $k=1,\dots,N$ 求和。左右两侧的 $f(\theta_k)$ 项裂项相消为 $f(\theta_1)-f(\theta_{N+1})$，再由 (A0) 有 $f(\theta_{N+1})\ge f^\ast$：

$$
\sum_{k=1}^N\Bigl(\gamma_k-\tfrac{\mathsf L}{2}\gamma_k^2\Bigr)\|\nabla f(\theta_k)\|^2
\le f(\theta_1)-f^\ast
-\sum_{k=1}^N\bigl(\gamma_k-\mathsf L\gamma_k^2\bigr)\langle\nabla f(\theta_k),\delta_k\rangle
+\frac{\mathsf L}{2}\sum_{k=1}^N\gamma_k^2\|\delta_k\|^2 .
\tag{2.3}
$$

### 第 3 步 —— 取期望（噪声项）

取全期望。两个事实使噪声项消失或被控制：

* **交叉项消失。** $\theta_k$ 是 $\mathcal F_{k-1}$-可测的，故给定历史时 $\nabla f(\theta_k)$ 已知，由 (A2$'$)，
$$
\mathbb{E}\bigl[\langle\nabla f(\theta_k),\delta_k\rangle\bigr]
=\mathbb{E}\Bigl[\langle\nabla f(\theta_k),\,\mathbb{E}[\delta_k\mid\mathcal F_{k-1}]\rangle\Bigr]
=\mathbb{E}\bigl[\langle\nabla f(\theta_k),0\rangle\bigr]=0 .
\tag{2.4}
$$
此处用到了塔性质（tower property），且无论 $\gamma_k-\mathsf L\gamma_k^2$ 的符号如何都成立。

* **方差项有界。**
$$
\mathbb{E}\bigl[\|\delta_k\|^2\bigr]
=\mathbb{E}\Bigl[\mathbb{E}[\|\delta_k\|^2\mid\mathcal F_{k-1}]\Bigr]\le\sigma_b^2 .
\tag{2.5}
$$

把 (2.4)–(2.5) 代入 (2.3) 的期望中：

$$
\sum_{k=1}^N\Bigl(\gamma_k-\tfrac{\mathsf L}{2}\gamma_k^2\Bigr)\,\mathbb{E}\|\nabla f(\theta_k)\|^2
\;\le\; f(\theta_1)-f^\ast+\frac{\mathsf L\,\sigma_b^2}{2}\sum_{k=1}^N\gamma_k^2 .
\tag{2.6}
$$

这就是**整个证明的心脏**（对应 Ghadimi–Lan 式 (2.11)）。后面全部都是记账工作。注意最终界的两项各自从哪里诞生：$f(\theta_1)-f^\ast$ 是*优化*项，$\tfrac{\mathsf L\sigma_b^2}{2}\sum\gamma_k^2$ 是将携带 $1/b$ 的*方差*项。

### 第 4 步 —— 通过随机化转到输出点

取停止权重 $w_k=2\gamma_k-\mathsf L\gamma_k^2=2(\gamma_k-\tfrac{\mathsf L}{2}\gamma_k^2)$，即

$$
\Pr\{R=k\}=\frac{2\gamma_k-\mathsf L\gamma_k^2}{\sum_{j=1}^N(2\gamma_j-\mathsf L\gamma_j^2)} ,
\tag{2.7}
$$

这要求 $\gamma_k<2/\mathsf L$ 以保证权重为正。由恒等式 (1.2)，(2.6) 左侧的加权平均*恰好*等于 $\tfrac12\sum_k(2\gamma_k-\mathsf L\gamma_k^2)\,\mathbb{E}\|\nabla f(\theta_k)\|^2$，故将 (2.6) 两边除以 $\tfrac12\sum_k(2\gamma_k-\mathsf L\gamma_k^2)$ 得

$$
\boxed{\;
\mathbb{E}\bigl[\|\nabla f(\theta_R)\|^2\bigr]
\;\le\;
\frac{2\bigl(f(\theta_1)-f^\ast\bigr)+\mathsf L\,\sigma_b^2\sum_{k=1}^N\gamma_k^2}
{\sum_{k=1}^N\bigl(2\gamma_k-\mathsf L\gamma_k^2\bigr)} \;}
\tag{2.8}
$$

再除以 $\mathsf L$ 并引入 $D_f:=\bigl[\tfrac{2(f(\theta_1)-f^\ast)}{\mathsf L}\bigr]^{1/2}$，即还原为论文的形式

$$
\frac1{\mathsf L}\,\mathbb{E}\bigl[\|\nabla f(\theta_R)\|^2\bigr]
\le\frac{D_f^2+\sigma_b^2\sum_{k=1}^N\gamma_k^2}{\sum_{k=1}^N(2\gamma_k-\mathsf L\gamma_k^2)} .
\tag{2.8$'$}
$$

这就是 Ghadimi–Lan 的**定理 2.1(a)**，推广到了逐步方差 $\sigma_b^2$ 的情形。$\blacksquare$

---

## 3. 常数步长：显式收敛率

现在特化到 $\gamma_k\equiv\eta$。此时 $\sum_k(2\gamma_k-\mathsf L\gamma_k^2)=N\eta(2-\mathsf L\eta)$ 且 $\sum_k\gamma_k^2=N\eta^2$，停止规则 (2.7) 变为**均匀分布** $\Pr\{R=k\}=1/N$，还原 (1.1)。代入 (2.8)：

$$
\mathbb{E}\bigl[\|\nabla f(\theta_R)\|^2\bigr]
\le\frac{2\bigl(f(\theta_1)-f^\ast\bigr)+\mathsf L\,\sigma_b^2\,N\eta^2}{N\eta(2-\mathsf L\eta)} .
\tag{3.1}
$$

### 选取 $\eta$

取步长足够小使 $\mathsf L\eta\le 1$，从而 $2-\mathsf L\eta\ge 1$，分母 $\ge N\eta$。于是 (3.1) 简化为

$$
\mathbb{E}\bigl[\|\nabla f(\theta_R)\|^2\bigr]
\le\frac{2\bigl(f(\theta_1)-f^\ast\bigr)}{N\eta}+\mathsf L\,\sigma_b^2\,\eta .
\tag{3.2}
$$

式 (3.2) 是最便于优化的形式：第一项随 $\eta$ 递减，第二项随 $\eta$ 递增。遵循 Ghadimi–Lan 推论 2.2，取

$$
\eta=\min\!\left\{\frac{1}{\mathsf L},\;\frac{\tilde D}{\sigma_b\sqrt N}\right\}
\tag{3.3}
$$

> **(3.3) 是怎么来的（步长选择的动机）。** 这个 $\min$ 不是从前面的式子机械"推导"出来的，而是为了最小化 (3.2) 而设计的。$\min$ 里两项各有来源。
>
> **第二项 $\dfrac{\tilde D}{\sigma_b\sqrt N}$——来自平衡 (3.2) 的两项。** 暂时忽略约束，把 (3.2) 右边记作 $\phi(\eta)=\dfrac{A}{\eta}+B\eta$，其中 $A=2(f(\theta_1)-f^\ast)$、$B=\mathsf L\sigma_b^2$。令 $\phi'(\eta)=-A/\eta^2+B=0$ 得无约束最优
> $$
> \eta^\star=\sqrt{\tfrac{A}{B}}=\sqrt{\tfrac{2(f(\theta_1)-f^\ast)}{\mathsf L\sigma_b^2}}=\frac{D_f}{\sigma_b},
> $$
> 其中用了 $D_f^2=\tfrac{2(f(\theta_1)-f^\ast)}{\mathsf L}$。这说明理想步长正比于 $1/\sigma_b$（噪声越大，步子越小），这正是第二项里 $1/\sigma_b$ 的由来。但 $\eta^\star=D_f/\sigma_b$ 是个**常数**，代回得 $\phi(\eta^\star)=2\sqrt{AB}=2\mathsf L D_f\sigma_b$，**不随 $N$ 衰减**——这是随机优化的本质困难：噪声项不会因多迭代自行消失，必须靠缩小步长来压。于是令步长随 $N$ 衰减，把分子换成待定常数 $\tilde D$（它扮演 $D_f$ 的角色，见下方"最优 $\tilde D$"），并补上 $\sqrt N$：
> $$
> \eta=\frac{\tilde D}{\sigma_b\sqrt N}.
> $$
> 为什么偏偏是 $\sqrt N$？设 $\eta\propto N^{-\alpha}$，代回后第一项 $\propto N^{\alpha-1}$、第二项 $\propto N^{-\alpha}$；要两项同阶且衰减最快，解 $\alpha-1=-\alpha$ 得 $\alpha=\tfrac12$。此时两项都是 $O(1/\sqrt N)$ 并随 $N\to\infty$ 趋零，恰好给出 $\sigma_b/\sqrt N$ 的收敛率。
>
> **第一项 $\dfrac{1}{\mathsf L}$——来自硬约束。** 它与噪声无关，纯粹是光滑下降引理可用的前提：为把 (3.1) 那个带 $(2-\mathsf L\eta)$ 分母的式子简化成干净的 (3.2)，需要 $\mathsf L\eta\le 1$ 即 $\eta\le 1/\mathsf L$（更根本地，定理 2.1 要求 $\gamma_k<2/\mathsf L$ 才能保证随机停时权重 (2.7) 为正，$\eta\le 1/\mathsf L$ 是更保守的版本）。这是步长的**上界**。
>
> **取 $\min$ 同时满足两者，并自动适配两个 regime。** 当 $N$ 小或噪声 $\sigma_b$ 小时，$\frac{\tilde D}{\sigma_b\sqrt N}$ 较大，$\min$ 取 $\frac{1}{\mathsf L}$，迈光滑性允许的最大步子（**优化主导**，行为像确定性梯度下降，$O(1/N)$）；当 $N$ 大或噪声大时，$\min$ 取 $\frac{\tilde D}{\sigma_b\sqrt N}$，缩小步长抑制方差（**噪声主导**，$O(1/\sqrt N)$）。这也正是为何最终界 (3.4) 长成"$1/N$ 项 + $1/\sqrt N$ 项"的形式——两个 regime 各贡献一项。下面化简中 $\frac1\eta=\max\{\mathsf L,\sigma_b\sqrt N/\tilde D\}\le\mathsf L+\sigma_b\sqrt N/\tilde D$ 这一步，正是把 $\min$ 拆成两项相加，使两个 regime 的贡献分别落入 $1/N$ 项与 $1/\sqrt N$ 项。

其中 $\tilde D>0$ 为自由常数。将 (3.3) 代入 (3.1) 并化简（利用 $\eta\le 1/\mathsf L$ 故 $2-\mathsf L\eta\ge 1$，以及 $\eta\le \tilde D/(\sigma_b\sqrt N)$），得

$$
\frac1{\mathsf L}\,\mathbb{E}\bigl[\|\nabla f(\theta_R)\|^2\bigr]
\;\le\;
B_N:=\frac{\mathsf L\,D_f^2}{N}
+\left(\tilde D+\frac{D_f^2}{\tilde D}\right)\frac{\sigma_b}{\sqrt N},
\qquad D_f^2=\frac{2(f(\theta_1)-f^\ast)}{\mathsf L}.
\tag{3.4}
$$

*(3.4) 的推导（推论 2.2 背后的代数）。* 从 (2.8$'$) 取 $\gamma_k\equiv\eta$ 出发：
$$
\frac{D_f^2+\sigma_b^2 N\eta^2}{N\eta(2-\mathsf L\eta)}
\le\frac{D_f^2+\sigma_b^2 N\eta^2}{N\eta}
=\frac{D_f^2}{N\eta}+\sigma_b^2\eta .
$$
第一部分用 $\frac1\eta=\max\{\mathsf L,\ \sigma_b\sqrt N/\tilde D\}\le \mathsf L+\sigma_b\sqrt N/\tilde D$，得 $\frac{D_f^2}{N\eta}\le\frac{\mathsf L D_f^2}{N}+\frac{D_f^2\sigma_b}{\tilde D\sqrt N}$。第二部分用 $\eta\le\tilde D/(\sigma_b\sqrt N)$，得 $\sigma_b^2\eta\le\frac{\tilde D\sigma_b}{\sqrt N}$。两者相加：
$$
\frac{D_f^2}{N\eta}+\sigma_b^2\eta
\le\frac{\mathsf L D_f^2}{N}+\Bigl(\tilde D+\frac{D_f^2}{\tilde D}\Bigr)\frac{\sigma_b}{\sqrt N}=B_N. \qquad\square
$$

### 最优 $\tilde D$

因子 $\tilde D+D_f^2/\tilde D$ 在 $\tilde D=D_f$ 处取最小值 $2D_f$。取此值后，

$$
\boxed{\;
\frac1{\mathsf L}\,\mathbb{E}\bigl[\|\nabla f(\theta_R)\|^2\bigr]
\;\le\;\frac{\mathsf L\,D_f^2}{N}+\frac{2D_f\,\sigma_b}{\sqrt N}\;}
\tag{3.5}
$$

在无噪声极限 $\sigma_b=0$ 下界为 $\mathbb{E}\|\nabla f(\theta_R)\|^2\le \mathsf L^2 D_f^2/N=O(1/N)$，即非凸光滑函数上梯度下降的标准（紧）收敛率；第二项是随机性带来的代价。

---

## 4. 从收敛率到迭代复杂度

现在反解 (3.5)，计算到达**$\epsilon$-稳定点**所需的迭代次数，其中稳定性的含义为

$$
\|\nabla f(\bar\theta)\|\le\epsilon
\qquad\Longleftrightarrow\qquad
\|\nabla f(\bar\theta)\|^2\le\epsilon^2 .
\tag{4.1}
$$

> **约定提醒。** Ghadimi–Lan 把目标定义为 $\mathbb{E}\|\nabla f\|^2\le\epsilon$（平方范数），故其复杂度写作 $\tilde O(1/\epsilon^2)$。而你要对照的问题陈述通过 $\|\nabla f\|\le\epsilon$（未平方）定义稳定性，于是同一结果在方差项里写作 $\tilde O(1/\epsilon^4)$。我们采用**未平方**的约定 (4.1)，即目标 $\mathbb{E}\|\nabla f(\theta_R)\|^2\le\epsilon^2$，这正是产生标题中 $\epsilon^2$ 与 $\sigma^2/(b\epsilon^2)$ 的根源。

要求 (3.5)（乘以 $\mathsf L$ 后）的每一项都不超过 $\tfrac12\epsilon^2$，使其和 $\le\epsilon^2$。

**第 1 项（优化项）。** 由 $\mathsf L^2 D_f^2=2\mathsf L\,(f(\theta_1)-f^\ast)$，
$$
\frac{\mathsf L^2 D_f^2}{N}\le\frac{\epsilon^2}{2}
\quad\Longleftrightarrow\quad
N\ge\frac{2\mathsf L^2 D_f^2}{\epsilon^2}=\frac{4\,\mathsf L\,(f(\theta_1)-f^\ast)}{\epsilon^2} .
\tag{4.2}
$$

**第 2 项（方差项）。** 由 $\mathsf L\cdot 2D_f\sigma_b/\sqrt N$，
$$
\frac{2\mathsf L D_f\,\sigma_b}{\sqrt N}\le\frac{\epsilon^2}{2}
\quad\Longleftrightarrow\quad
N\ge\frac{16\,\mathsf L^2 D_f^2\,\sigma_b^2}{\epsilon^4}
=\frac{32\,\mathsf L\,(f(\theta_1)-f^\ast)\,\sigma_b^2}{\epsilon^4} .
\tag{4.3}
$$

所需 $N$ 取 (4.2)、(4.3) 中较大者；既然两者都须成立，我们直接相加即可（只改变常数）。把绝对常数藏进 $O(\cdot)$，

$$
N=O\!\left(\frac{\mathsf L\,(f(\theta_1)-f^\ast)}{\epsilon^2}
+\frac{\mathsf L\,(f(\theta_1)-f^\ast)\,\sigma_b^2}{\epsilon^4}\right)
=O\!\left(\frac{\mathsf L\,(f(\theta_1)-f^\ast)}{\epsilon^2}\left[\,1+\frac{\sigma_b^2}{\epsilon^2}\right]\right).
\tag{4.4}
$$

### 代入小批量方差

最后代入引理 0 的 $\sigma_b^2=\sigma^2/b$，并还原损失记号 $f=L$、$f(\theta_1)=L(\theta_0)$、$f^\ast=L^\ast$、$\mathsf L=L$（Lipschitz 常数）。$\tilde O$ 吸收了 §5 高概率转换带来的（轻微的）对数/常数开销：

$$
\boxed{\;
N=\tilde O\!\left(\frac{L\,\bigl(L(\theta_0)-L^\ast\bigr)}{\epsilon^2}
\left[\,1+\frac{\sigma^2}{b\,\epsilon^2}\right]\right)\;}
\tag{4.5}
$$

这正是所声称的界。$\blacksquare$

---

## 5. "以高概率至少访问一次 $\epsilon$-稳定点"

两个小补充即可严格化该说法的措辞。

### 5.1 从期望到高概率（Markov）

界 (3.5)/(4.4) 控制了 $\mathbb{E}\|\nabla f(\theta_R)\|^2\le \mathsf L B_N$。由 **Markov 不等式**，对任意 $\lambda>1$，

$$
\Pr\bigl\{\|\nabla f(\theta_R)\|^2\ge\lambda\,\mathsf L B_N\bigr\}\le\frac1\lambda .
\tag{5.1}
$$

于是为得到一个 **$(\epsilon,\Lambda)$-解** —— 即满足 $\Pr\{\|\nabla f\|^2\le\epsilon^2\}\ge 1-\Lambda$ 的点 —— 只需把 $\mathsf L B_N$ 压到 $\le \Lambda\epsilon^2$，这只会让 $N$ 乘上一个 $1/\Lambda$ 量级的因子。等价地，运行足够久后，随机返回的 $\theta_R$ 以概率 $\ge 1-\Lambda$ 为 $\epsilon$-稳定点。由于 $\theta_R$ 是被访问过的迭代点 $\theta_1,\dots,\theta_N$ 之一，轨迹便以至少该概率**访问**到一个 $\epsilon$-稳定点 —— 这就是"至少一次"的措辞含义。

这个粗糙的 $1/\Lambda$ 依赖，正是论文中两阶段（2-RSG）后优化步骤的动机所在；见 §5.2。

### 5.2 锐化置信度（两阶段／中位数技巧，可选）

Ghadimi–Lan 把 $1/\Lambda$ 改进为 $\log(1/\Lambda)$：独立运行 $S=\lceil\log_2(2/\Lambda)\rceil$ 份 RSG 得到候选 $\bar\theta_1,\dots,\bar\theta_S$，再选取

$$
\bar\theta^\ast=\arg\min_{s=1,\dots,S}\,\bigl\|\,\hat g(\bar\theta_s)\bigr\|,
\qquad \hat g(\bar\theta_s)=\frac1T\sum_{k=1}^T G(\bar\theta_s,\xi_k),
$$

其中 $\hat g$ 是在一份大小为 $T$ 的新样本上的经验梯度估计。两个要素完成证明：

* **独立性放大成功率。** 每份运行独立地"未能（在常数倍意义下）达到 $\epsilon$-稳定"的概率 $\le\tfrac12$（在 (5.1) 中取 $\lambda=2$）；*全部* $S$ 份都失败的概率 $\le 2^{-S}\le\Lambda/2$。
* **选择是可靠的。** 估计量 $\hat g$ 集中：$\|\hat g(\bar\theta_s)-\nabla f(\bar\theta_s)\|^2\le \lambda\sigma^2/T$ 以概率 $\ge 1-1/\lambda$ 成立（对平均噪声范数用 Markov；在轻尾假设下，一个向量鞅界可把它升级为 $\exp(-\lambda^2/3)$）。取 $T=O(\sigma^2/(\Lambda\epsilon^2))$ 使选择误差相对 $\epsilon$ 可忽略。

合并起来，$\bar\theta^\ast$ 是一个 $(\epsilon,\Lambda)$-解，总 oracle 代价变为
$$
O\!\left(\frac{\log(1/\Lambda)}{\epsilon^2}+\frac{\sigma^2}{\epsilon^4}\log\frac1\Lambda+\frac{\log^2(1/\Lambda)\,\sigma^2}{\Lambda\epsilon^2}\right)
$$
（在平方范数约定下），即 (4.5) 中 $\tilde O$ 所吸收的 $\log(1/\Lambda)$ 依赖。轻尾变体可去掉最后一项里残留的 $1/\Lambda$。

---

## 6. 为何"$b$ 不能太大"：$1/b$ 加速的饱和

把 (4.4) 看成 $b$ 的函数（通过 $\sigma_b^2=\sigma^2/b$）：

$$
N(b)=O\!\left(\underbrace{\frac{\mathsf L\,(f(\theta_1)-f^\ast)}{\epsilon^2}}_{\text{与 batch 无关}}
\;+\;\underbrace{\frac{\mathsf L\,(f(\theta_1)-f^\ast)\,\sigma^2}{b\,\epsilon^4}}_{\propto\,1/b}\right).
$$

* **方差主导区（小／中等 $b$）。** 当第二项主导时，$N(b)\propto 1/b$：batch 翻倍则迭代次数减半。此时*梯度样本总数* $N\cdot b$ 大致不变，所以小批量主要买来的是**并行性／更少的步数**，而非更少的总样本 —— 但每次迭代的 $1/b$ 缩放是货真价实的。这就是该论断所指的区间（"收敛率直接随 $1/b$ 缩放"）。
* **优化主导区（大 $b$）。** 一旦 $b\gtrsim \sigma^2/(\mathsf L(f(\theta_1)-f^\ast)\cdot\epsilon^{-2}\cdot\epsilon^{2})\sim \sigma^2/\epsilon^2$，第一项（与 batch 无关）开始接管，继续增大 $b$ 不再降低 $N$。此时更大的 batch 只是在浪费样本。这正是 **"只要小批量 $b$ 不太大"** 的精确含义。

临界 batch 大小为 $b^\star\sim \sigma^2/\epsilon^2$（至多差损失间隙与 Lipschitz 因子）：低于它时小批量线性地有帮助，高于它则收益消失。

---

## 7. 逻辑链条总结

| 步骤 | 陈述 | 对应 Ghadimi–Lan 出处 |
|---|---|---|
| 光滑性 ⇒ 下降引理 | (0.2) | 式 (1.6) |
| 小批量方差缩减 | $\sigma_b^2=\sigma^2/b$，引理 0 | （论文中无；标准结果） |
| 含噪声拆分的逐步下降 | (2.2) | 式 (2.8) |
| 裂项求和 + 下界 | (2.3) | 式 (2.9) |
| 取期望：交叉项 $=0$、方差 $\le\sigma_b^2$ | (2.6) | 式 (2.10)–(2.11) |
| 随机输出恒等式 | (1.2),(2.7) | 式 (2.3) |
| 输出点处的主界 | (2.8),(2.8$'$) | **定理 2.1(a)**，式 (2.4) |
| 常数步长，选 $\eta,\tilde D$ | (3.3)–(3.5) | **推论 2.2**，式 (2.13)–(2.17) |
| 反解迭代次数 | (4.4) | 推论 2.2 之后的讨论 |
| 代入 $\sigma_b^2=\sigma^2/b$ | (4.5) | （小批量推论） |
| 期望 ⇒ 高概率 | (5.1) | 式 (2.19)，Markov |
| 置信度提升（可选） | §5.2 | 定理 2.4（2-RSG） |

**结论一句话。** 下降引理加裂项求和给出 $\sum_k(\gamma_k-\tfrac{\mathsf L}{2}\gamma_k^2)\mathbb{E}\|\nabla f(\theta_k)\|^2\le (f(\theta_1)-f^\ast)+\tfrac{\mathsf L\sigma_b^2}{2}\sum_k\gamma_k^2$。随机输出把左侧变成 $\mathbb{E}\|\nabla f(\theta_R)\|^2$；常数步长在优化项 $\propto 1/N$ 与方差项 $\propto \sigma_b/\sqrt N$ 之间取平衡；反解并代入 $\sigma_b^2=\sigma^2/b$ 即得
$$
N=\tilde O\!\left(\frac{L(L(\theta_0)-L^\ast)}{\epsilon^2}\Bigl[1+\frac{\sigma^2}{b\epsilon^2}\Bigr]\right).
$$

---

### 参考文献

S. Ghadimi and G. Lan. *Stochastic First- and Zeroth-Order Methods for Nonconvex Stochastic Programming.* SIAM Journal on Optimization, 23(4):2341–2368, 2013. 预印本：arXiv:1309.5549。（定理 2.1、推论 2.2、定理 2.4。）
